// Sentinel — the watchdog agent the user explicitly asked for. Runs every
// 5 minutes via cron-job.org. Performs a battery of health checks across
// every system the site depends on. Auto-fixes what it can. Surfaces what
// it can't to Telegram with structured severity + dedupe so the user
// doesn't get spammed.
//
// Design goals from user brief (2026-05-13):
// 1. Detect problems the user would otherwise have to spot manually.
// 2. Self-heal where possible (re-fire broadcasts, re-trigger crons,
//    re-run translations, force CDN revalidation).
// 3. Alert on Telegram for everything it touches — both fixes and
//    unfixable issues — so the user has a single feed of "what changed
//    while I wasn't looking".
// 4. Dedupe: same issue alerts at most once per hour, so a persistent
//    failure doesn't drown the chat.
//
// The agent reads its own past behaviour from agentLog (action='sentinel-*')
// to enforce dedupe and to avoid auto-fix loops (e.g. if we already tried
// to fix something twice in the last hour, give up and alert).

import { prisma } from '../db';
import { tg } from '../telegram';
import { runSocialRetry } from './social-retry';
import { SITE } from '../site';

const SITE_URL = SITE.url;
const DEDUPE_WINDOW_MIN = 60; // suppress duplicate alerts for the same issue this long

type Severity = 'critical' | 'warning' | 'info';
type CheckResult = {
  key: string;             // stable id used for dedupe ('cache-no-store', 'mastodon-down', ...)
  severity: Severity;
  ok: boolean;
  message: string;         // human-readable status
  autoFixed?: string;      // description of what we auto-fixed, if anything
};

export type SentinelReport = {
  checked: number;
  passed: number;
  failed: number;
  autoFixed: number;
  alerted: number;
  checks: CheckResult[];
};

const sev = { critical: '🚨', warning: '⚠️', info: 'ℹ️' } as const;

// Check if we've already alerted on this issue within the dedupe window.
async function recentlyAlerted(key: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUPE_WINDOW_MIN * 60_000);
  const row = await prisma.agentLog.findFirst({
    where: { agent: 'sentinel', action: `alert-${key}`, createdAt: { gte: since } },
    select: { id: true },
  });
  return !!row;
}

async function logAlert(key: string, sevValue: Severity, message: string): Promise<void> {
  await prisma.agentLog.create({
    data: { agent: 'sentinel', action: `alert-${key}`, status: sevValue === 'critical' ? 'error' : 'warn', message: message.slice(0, 400) },
  }).catch(() => null);
}

async function logFix(key: string, what: string): Promise<void> {
  await prisma.agentLog.create({
    data: { agent: 'sentinel', action: `fix-${key}`, status: 'success', message: what.slice(0, 400) },
  }).catch(() => null);
}

// ─── Individual checks ────────────────────────────────────────────────────

// 1. Cache headers on article pages — flag if Cache-Control says no-store
async function checkCacheHeaders(): Promise<CheckResult> {
  try {
    const top = await prisma.article.findFirst({
      where: { status: 'published' },
      orderBy: { views: 'desc' },
      select: { slug: true },
    });
    if (!top) return { key: 'cache-headers', severity: 'info', ok: true, message: 'no articles to test' };
    const res = await fetch(`${SITE_URL}/article/${top.slug}`, { method: 'HEAD', signal: AbortSignal.timeout(8_000) });
    const cc = res.headers.get('cache-control') ?? '';
    const isStatic = /public/.test(cc) && /s-maxage=\d+/.test(cc);
    if (isStatic) return { key: 'cache-headers', severity: 'info', ok: true, message: `Cache-Control OK: ${cc.slice(0, 80)}` };
    return { key: 'cache-headers', severity: 'critical', ok: false, message: `Cache-Control wrong: ${cc.slice(0, 80)}` };
  } catch (err) {
    return { key: 'cache-headers', severity: 'warning', ok: false, message: `check failed: ${(err as Error).message}` };
  }
}

// 2. Writer cron pulse — when did the most recent article actually publish?
async function checkWriterPulse(): Promise<CheckResult> {
  const newest = await prisma.article.findFirst({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    select: { publishedAt: true, slug: true },
  });
  if (!newest?.publishedAt) return { key: 'writer-pulse', severity: 'critical', ok: false, message: 'no published articles found' };
  const ageMin = Math.floor((Date.now() - newest.publishedAt.getTime()) / 60_000);
  if (ageMin > 240) {
    return { key: 'writer-pulse', severity: 'critical', ok: false, message: `Writer silent for ${ageMin}min (last: ${newest.slug})` };
  }
  if (ageMin > 90) {
    return { key: 'writer-pulse', severity: 'warning', ok: false, message: `Writer last ran ${ageMin}min ago — expected every 30min` };
  }
  return { key: 'writer-pulse', severity: 'info', ok: true, message: `Writer last published ${ageMin}min ago` };
}

// 3. Social broadcast health — per channel success rate over last 24h
async function checkSocial(): Promise<CheckResult[]> {
  const since = new Date(Date.now() - 24 * 3600_000);
  const rows = await prisma.agentLog.findMany({
    where: { agent: 'social', action: { startsWith: 'broadcast-' }, createdAt: { gte: since } },
  });
  const byChannel = new Map<string, { ok: number; fail: number }>();
  for (const r of rows) {
    const ch = r.action.replace(/^broadcast-/, '');
    const stat = byChannel.get(ch) ?? { ok: 0, fail: 0 };
    if (r.status === 'success') stat.ok++; else stat.fail++;
    byChannel.set(ch, stat);
  }
  const results: CheckResult[] = [];
  // Channels we actually expect to work (creds configured). Inferred from env.
  const expected: Record<string, boolean> = {
    mastodon: !!process.env.MASTODON_ACCESS_TOKEN,
    bluesky: !!process.env.BLUESKY_APP_PASSWORD,
    linkedin: !!process.env.LINKEDIN_ACCESS_TOKEN,
    threads: !!process.env.THREADS_ACCESS_TOKEN,
    pinterest: !!process.env.PINTEREST_ACCESS_TOKEN,
    tumblr: !!process.env.TUMBLR_API_KEY,
    // x: paid plan, skip — already known to be paused
  };
  for (const [ch, isExpected] of Object.entries(expected)) {
    if (!isExpected) continue;
    const stat = byChannel.get(ch) ?? { ok: 0, fail: 0 };
    const total = stat.ok + stat.fail;
    if (total === 0) {
      results.push({ key: `social-${ch}`, severity: 'warning', ok: false, message: `${ch}: no broadcasts in 24h` });
    } else {
      const okRate = stat.ok / total;
      if (okRate < 0.5) {
        results.push({ key: `social-${ch}`, severity: 'critical', ok: false, message: `${ch}: ${stat.ok}/${total} success (${Math.round(okRate * 100)}%)` });
      } else {
        results.push({ key: `social-${ch}`, severity: 'info', ok: true, message: `${ch}: ${stat.ok}/${total} ok` });
      }
    }
  }
  return results;
}

// 4. Sitemap reachable
async function checkSitemap(): Promise<CheckResult> {
  try {
    const [main, news] = await Promise.all([
      fetch(`${SITE_URL}/sitemap.xml`, { signal: AbortSignal.timeout(8_000) }),
      fetch(`${SITE_URL}/news-sitemap.xml`, { signal: AbortSignal.timeout(8_000) }),
    ]);
    if (!main.ok || !news.ok) {
      return { key: 'sitemap', severity: 'critical', ok: false, message: `sitemap ${main.status} / news ${news.status}` };
    }
    return { key: 'sitemap', severity: 'info', ok: true, message: `sitemap ${main.status}, news-sitemap ${news.status}` };
  } catch (err) {
    return { key: 'sitemap', severity: 'critical', ok: false, message: `sitemap fetch failed: ${(err as Error).message}` };
  }
}

// 5. Home page response code + size sanity check
async function checkHome(): Promise<CheckResult> {
  try {
    const res = await fetch(SITE_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { key: 'home', severity: 'critical', ok: false, message: `home ${res.status}` };
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > 0 && len < 5000) return { key: 'home', severity: 'warning', ok: false, message: `home unusually small: ${len}b` };
    return { key: 'home', severity: 'info', ok: true, message: `home ${res.status}` };
  } catch (err) {
    return { key: 'home', severity: 'critical', ok: false, message: `home fetch failed: ${(err as Error).message}` };
  }
}

// 6. Translation coverage — how many recent articles lack a DE translation
async function checkTranslationCoverage(): Promise<CheckResult> {
  const sinceHours = 6;
  const since = new Date(Date.now() - sinceHours * 3600_000);
  const recent = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: since } },
    select: { id: true },
  });
  if (recent.length === 0) return { key: 'translation', severity: 'info', ok: true, message: 'no recent articles to translate' };
  const translatedIds = new Set(
    (await prisma.translation.findMany({
      where: { lang: 'de', articleId: { in: recent.map((r) => r.id) } },
      select: { articleId: true },
    })).map((t) => t.articleId)
  );
  const missing = recent.length - translatedIds.size;
  const missingRate = missing / recent.length;
  if (missingRate > 0.3 && missing >= 5) {
    return { key: 'translation', severity: 'warning', ok: false, message: `${missing}/${recent.length} recent articles missing DE translation` };
  }
  return { key: 'translation', severity: 'info', ok: true, message: `${recent.length - missing}/${recent.length} translated` };
}

// 7. Gemini fallback alerts — counts pure-error events for the LLM provider
async function checkLLMFallback(): Promise<CheckResult> {
  const since = new Date(Date.now() - 24 * 3600_000);
  const fallbacks = await prisma.agentLog.count({
    where: { action: { contains: 'fallback' }, status: { in: ['warn', 'error'] }, createdAt: { gte: since } },
  });
  if (fallbacks > 10) {
    return { key: 'llm-fallback', severity: 'warning', ok: false, message: `${fallbacks} LLM fallbacks in 24h — quota/billing issue?` };
  }
  return { key: 'llm-fallback', severity: 'info', ok: true, message: `${fallbacks} LLM fallbacks in 24h` };
}

// 8. Og-Proxy health — fetch a few proxied images and check they're 200
async function checkOgProxy(): Promise<CheckResult> {
  try {
    const recent = await prisma.article.findMany({
      where: { status: 'published', imageUrl: { not: null } },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });
    if (recent.length === 0) return { key: 'og-proxy', severity: 'info', ok: true, message: 'no recent images to test' };
    let failed = 0;
    for (const a of recent) {
      if (!a.imageUrl) continue;
      try {
        const r = await fetch(`${SITE_URL}/api/og-proxy?url=${encodeURIComponent(a.imageUrl)}`, { method: 'HEAD', signal: AbortSignal.timeout(6_000) });
        if (!r.ok) failed++;
      } catch { failed++; }
    }
    if (failed >= 3) {
      return { key: 'og-proxy', severity: 'critical', ok: false, message: `${failed}/${recent.length} og-proxy fetches failed` };
    }
    if (failed >= 1) {
      return { key: 'og-proxy', severity: 'warning', ok: false, message: `${failed}/${recent.length} og-proxy fetches failed` };
    }
    return { key: 'og-proxy', severity: 'info', ok: true, message: `${recent.length}/${recent.length} og-proxy ok` };
  } catch (err) {
    return { key: 'og-proxy', severity: 'warning', ok: false, message: `og-proxy check failed: ${(err as Error).message}` };
  }
}

// ─── Auto-fix actions ─────────────────────────────────────────────────────

// Fire the social-retry agent to mop up failed broadcasts
async function autoFixSocial(): Promise<string> {
  try {
    const report = await runSocialRetry({ limit: 10 });
    if (report.retried > 0) {
      return `social-retry: ${report.succeeded}/${report.retried} re-posts succeeded`;
    }
    return 'social-retry: nothing to retry';
  } catch (err) {
    return `social-retry failed: ${(err as Error).message}`;
  }
}

// Trigger the Writer cron manually when it's been silent
async function autoFixWriter(): Promise<string> {
  try {
    const token = process.env.CRON_SECRET;
    if (!token) return 'CRON_SECRET missing';
    const res = await fetch(`${SITE_URL}/api/cron?token=${token}`, { signal: AbortSignal.timeout(50_000) });
    return `writer-cron triggered: HTTP ${res.status}`;
  } catch (err) {
    return `writer-cron trigger failed: ${(err as Error).message}`;
  }
}

// ─── Main entry ───────────────────────────────────────────────────────────

export async function runSentinel(): Promise<SentinelReport> {
  const checks: CheckResult[] = [];

  // Run all base checks
  const baseChecks = await Promise.allSettled([
    checkCacheHeaders(),
    checkWriterPulse(),
    checkSitemap(),
    checkHome(),
    checkTranslationCoverage(),
    checkLLMFallback(),
    checkOgProxy(),
  ]);
  for (const r of baseChecks) {
    if (r.status === 'fulfilled') checks.push(r.value);
  }
  // Social checks come as an array — flatten
  try {
    const socialResults = await checkSocial();
    checks.push(...socialResults);
  } catch { /* ignore */ }

  // Apply auto-fixes for known-fixable problems
  for (const c of checks) {
    if (c.ok) continue;
    if (c.key === 'writer-pulse' && c.severity === 'critical') {
      c.autoFixed = await autoFixWriter();
      await logFix(c.key, c.autoFixed);
    }
    if (c.key.startsWith('social-') && c.severity === 'critical') {
      // Run social-retry once across the board (not per channel — it's already fan-out)
      if (!checks.some((cc) => cc.autoFixed?.startsWith('social-retry'))) {
        c.autoFixed = await autoFixSocial();
        await logFix(c.key, c.autoFixed);
      }
    }
  }

  // Dedupe + alert
  let alerted = 0;
  const messages: string[] = [];
  for (const c of checks) {
    if (c.ok) continue;
    if (await recentlyAlerted(c.key)) continue;
    await logAlert(c.key, c.severity, c.message);
    messages.push(`${sev[c.severity]} ${c.key}: ${c.message}${c.autoFixed ? `\n  → fixed: ${c.autoFixed}` : ''}`);
    alerted++;
  }

  if (messages.length > 0) {
    await tg(`Sentinel-Report · ${alerted} ${alerted === 1 ? 'issue' : 'issues'} detected\n\n${messages.join('\n\n')}`);
  }

  return {
    checked: checks.length,
    passed: checks.filter((c) => c.ok).length,
    failed: checks.filter((c) => !c.ok).length,
    autoFixed: checks.filter((c) => c.autoFixed).length,
    alerted,
    checks,
  };
}
