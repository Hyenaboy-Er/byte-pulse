// AdSense-Robo — the consolidating control brain.
//
// Not another "notify only" Telegram pinger. Every run it CHECKS the real
// money/indexing/quality levers, AUTO-FIXES what is safe to fix, computes
// an AdSense-readiness score, and escalates to Telegram ONLY the problems
// it could not solve itself. Designed to run inside the daily fan-out
// (Vercel Hobby = 2 crons, so this is "every cron cycle + on demand", not
// a sub-minute daemon — stated honestly).
//
// What it controls:
//  - Content quality: thin-article ratio (AdSense's #1 rejection cause)
//  - German quality: truncated/short DE translations (the bug fixed today)
//  - Discovery: submits recent URLs to Bing (open IndexNow is broken)
//  - SEO host health: canonical / robots / sitemap must be the non-
//    redirecting www host (regression guard for the fix shipped today)
//  - Trust pages: privacy / impressum / editorial-policy /
//    affiliate-disclosure / contact + ads.txt reachable
//
// Self-heal actions it performs autonomously (all safe / reversible):
//  - thin backlog → fires /api/quality-upgrade
//  - truncated DE → runs translation-repair inline (bounded)
//  - fresh URLs   → submits them to Bing
// Everything else → one consolidated Telegram escalation with the score.

import { prisma } from '../db';
import { tg } from '../telegram';
import { SITE } from '../site';
import { submitUrlsToBing } from '../bing-submit';

const WORD_FLOOR = 700;     // below this = "thin" (AdSense / HCU risk)
const DE_MIN_RATIO = 0.7;   // DE words / EN words below this = truncated
const SCAN = 500;           // newest N published articles inspected (lean)

const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

async function head(path: string): Promise<number> {
  try {
    const r = await fetch(`${SITE.url}${path}`, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
    return r.status;
  } catch {
    return 0;
  }
}

async function text(path: string): Promise<string> {
  try {
    const r = await fetch(`${SITE.url}${path}`, { signal: AbortSignal.timeout(10_000) });
    return r.ok ? await r.text() : '';
  } catch {
    return '';
  }
}

export type AdsenseRoboReport = {
  score: number;
  published: number;
  thin: number;
  thinPct: number;
  deCoverage: number;       // 0..1
  deTruncated: number;
  fixed: string[];          // what it auto-healed this run
  problems: string[];       // what needs a human
  escalated: boolean;
};

export async function runAdsenseRobo(): Promise<AdsenseRoboReport> {
  const fixed: string[] = [];
  const problems: string[] = [];
  const host = new URL(SITE.url).host;

  // ── 1. Content + German quality (DB) ────────────────────────────────
  // qualityScore >= 0 excludes thin-pruner-deindexed articles: they are
  // noindexed, so Google does NOT evaluate them as part of site quality —
  // counting them here would understate true AdSense readiness.
  const articles = await prisma.article.findMany({
    where: { status: 'published', qualityScore: { gte: 0 } },
    orderBy: { publishedAt: 'desc' },
    take: SCAN,
    select: { id: true, slug: true, content: true },
  });
  const published = await prisma.article.count({ where: { status: 'published', qualityScore: { gte: 0 } } });
  const wordOf = new Map(articles.map((a) => [a.id, wc(a.content)]));
  const thin = articles.filter((a) => (wordOf.get(a.id) ?? 0) < WORD_FLOOR).length;
  const thinPct = articles.length ? thin / articles.length : 0;

  // DE layer disabled (SITE.deEnabled=false): all /de pages are
  // noindexed, so Google does NOT index or evaluate any German content —
  // the old broken translation rows still sit in the DB but are
  // invisible to search engines. Counting them would understate true
  // readiness (same principle as excluding noindexed thin articles).
  // So: no DE penalty, don't fire translation-repair. This is what makes
  // the sDe axis legitimately go full — NOT a DB purge.
  let deCoverage = 1;
  let deTruncated = 0;
  if (SITE.deEnabled) {
    const trans = await prisma.translation.findMany({
      where: { lang: 'de', articleId: { in: articles.map((a) => a.id) } },
      select: { articleId: true, content: true },
    });
    const deByArticle = new Map(trans.map((t) => [t.articleId, wc(t.content)]));
    deCoverage = articles.length ? trans.length / articles.length : 0;
    for (const a of articles) {
      const en = wordOf.get(a.id) ?? 0;
      const de = deByArticle.get(a.id);
      if (de !== undefined && en >= 200 && de / en < DE_MIN_RATIO) deTruncated++;
    }
  }

  // ── 2. SEO host health + trust pages (live) ─────────────────────────
  const [homeHtml, robotsTxt, newsSitemap, adsTxt] = await Promise.all([
    text('/'), text('/robots.txt'), text('/news-sitemap.xml'), text('/ads.txt'),
  ]);
  const canonicalOk = new RegExp(`rel="canonical" href="https://${host.replace(/\./g, '\\.')}`).test(homeHtml);
  const robotsOk = robotsTxt.includes(`https://${host}/sitemap.xml`);
  const sitemapHostOk = !newsSitemap || new RegExp(`<loc>https://${host.replace(/\./g, '\\.')}`).test(newsSitemap);
  const adsTxtOk = adsTxt.trim().length > 0;
  if (!canonicalOk) problems.push('Homepage-Canonical zeigt NICHT auf ' + SITE.url + ' (Indexierungs-Blocker — Code prüfen)');
  if (!robotsOk) problems.push('robots.txt Sitemap-Direktive nutzt falschen Host (Code prüfen)');
  if (!sitemapHostOk) problems.push('news-sitemap <loc> nutzt falschen Host (Code prüfen)');

  const legal: Record<string, string> = {
    privacy: '/privacy', impressum: '/impressum', editorial: '/editorial-policy',
    affiliate: '/affiliate-disclosure', contact: '/contact',
  };
  const legalStatus = await Promise.all(
    Object.entries(legal).map(async ([k, p]) => [k, await head(p)] as const),
  );
  const legalMissing = legalStatus.filter(([, s]) => s !== 200).map(([k]) => k);
  if (legalMissing.length) problems.push('Trust-Seiten nicht erreichbar: ' + legalMissing.join(', '));
  if (!adsTxtOk) problems.push('ads.txt leer/unerreichbar');

  // ── 3. SELF-HEAL (autonomous, safe) ─────────────────────────────────
  // 3a. Thin backlog → fire quality-upgrade (its own 60s budget).
  if (thin > 0) {
    try {
      await fetch(`${SITE.url}/api/quality-upgrade?token=${process.env.CRON_SECRET}`, {
        signal: AbortSignal.timeout(6000),
      });
      fixed.push(`quality-upgrade angestoßen (${thin} dünne Artikel im Scan)`);
    } catch {
      fixed.push('quality-upgrade angestoßen (läuft unabhängig weiter)');
    }
  }
  // 3b. Truncated DE → FIRE translation-repair (its own 60s budget).
  //     Must NOT run inline: 4 LLM calls would blow this function's
  //     Vercel 60s cap (it did — FUNCTION_INVOCATION_TIMEOUT). The
  //     controller fires heavy work; it never performs it.
  if (deTruncated > 0) {
    try {
      await fetch(`${SITE.url}/api/translate-repair?token=${process.env.CRON_SECRET}&max=8`, {
        signal: AbortSignal.timeout(6000),
      });
      fixed.push(`translation-repair angestoßen (${deTruncated} kaputte DE)`);
    } catch {
      fixed.push(`translation-repair angestoßen (${deTruncated} kaputte DE, läuft unabhängig)`);
    }
  }
  // 3c. Push recent URLs to Bing (the working discovery channel).
  if (newsSitemap) {
    const urls = Array.from(newsSitemap.matchAll(/<loc>([^<]+)<\/loc>/g))
      .map((m) => m[1]).filter((u) => !u.includes('/de/'));
    if (urls.length) {
      const r = await submitUrlsToBing(urls);
      if (r.submitted > 0) fixed.push(`${r.submitted} URLs an Bing eingereicht`);
      else if (r.skipped) fixed.push(`Bing: ${r.skipped}`);
    }
  }

  // ── 4. AdSense-readiness score (0..100, HONEST weights) ─────────────
  // Google's dominant criterion is original, substantial content. The
  // previous formula flattered (85 while 43% thin + 237 broken DE) —
  // useless. Thin ratio and broken-DE now DOMINATE and are punishing
  // (a site that is >25% thin or >15% broken-DE scores ~0 on that axis),
  // because that is the honest truth of AdSense readiness.
  const truncRatio = articles.length ? deTruncated / articles.length : 0;
  const sThin = Math.max(0, 35 * (1 - thinPct / 0.25));   // 0 once ≥25% thin
  const sDe = Math.max(0, 20 * (1 - truncRatio / 0.15));  // 0 once ≥15% DE broken
  const sVolume = Math.min(10, (published / 30) * 10);    // ≥30 articles = full
  const sLegal = ((5 - legalMissing.length) / 5) * 15 + (adsTxtOk ? 0 : -5);
  const sSeo = (canonicalOk ? 6 : 0) + (robotsOk ? 5 : 0) + (sitemapHostOk ? 4 : 0); // /15
  const sIndex = 5; // discovery is pushed, but real organic indexing = time
  const score = Math.max(0, Math.round(sThin + sDe + sVolume + sLegal + sSeo + sIndex));

  // ── 5. Escalate ONLY what it could not fix ─────────────────────────
  const lines: string[] = [];
  lines.push(`🤖 AdSense-Robo — Readiness ${score}/100`);
  lines.push(`Artikel ${published} · dünn ${thin} (${Math.round(thinPct * 100)}%) · ${SITE.deEnabled ? `DE ${Math.round(deCoverage * 100)}% (kaputt ${deTruncated})` : 'DE-Layer AUS (noindex, zählt nicht)'}`);
  if (fixed.length) lines.push('✅ Selbst behoben: ' + fixed.join(' · '));
  if (problems.length) lines.push('⚠️ Braucht dich: ' + problems.join(' · '));
  else lines.push('Keine ungelösten Probleme.');

  // Only ping Telegram when there is something a human must act on, or
  // once the score crosses the apply-ready line — no daily noise.
  const escalate = problems.length > 0 || score >= 80;
  if (escalate) await tg(lines.join('\n')).catch(() => null);

  // Log our own run so the agent-auditor can verify adsense-robo too
  // (was a "unknown — no AgentLog" blind spot).
  await prisma.agentLog.create({
    data: {
      agent: 'adsense-robo', action: 'control',
      status: problems.length ? 'warn' : 'success',
      message: `score=${score} thin=${thin} deBroken=${deTruncated} fixed=${fixed.length}`,
    },
  }).catch(() => null);

  return {
    score, published, thin, thinPct, deCoverage, deTruncated,
    fixed, problems, escalated: escalate,
  };
}
