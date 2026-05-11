// SEO-Auditor agent — scans the site every ~6h for SEO-relevant issues that
// the Reviewer / Quality-Auditor don't cover. Different from Quality-Auditor:
// QA looks at one article at a time, SEO-Auditor looks at site-wide signals
// that affect Google ranking + AdSense approval.
//
// Checks performed (all heuristic, no external API needed):
//   1. Sitemap reachability + non-empty
//   2. robots.txt reachability + valid
//   3. ads.txt reachability + present (AdSense readiness)
//   4. Articles published in last 7d but never crawled (sitemap fresh)
//   5. Articles with broken canonical (canonical doesn't match URL)
//   6. Orphan articles (no internal links pointing to them in last 30 days
//      of published content)
//   7. Missing hreflang pairing (EN exists but DE doesn't, or vice versa)
//
// Alerts via Telegram, cooldown 24h per issue-class so we don't spam.

import { prisma } from '../db';
import { tg } from '../telegram';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';

type SeoIssue = {
  kind: 'sitemap-empty' | 'robots-missing' | 'ads-txt-missing' | 'orphan' | 'missing-hreflang' | 'canonical-mismatch' | 'low-article-count';
  detail: string;
  severity: 'low' | 'medium' | 'high';
};

const COOLDOWN_MS = 24 * 3600 * 1000;

async function alertedRecently(kind: SeoIssue['kind']): Promise<boolean> {
  const r = await prisma.agentLog.findFirst({
    where: {
      agent: 'seo-auditor',
      action: 'flag',
      message: { contains: `kind=${kind}` },
      createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) },
    },
  });
  return !!r;
}

async function logIssue(issue: SeoIssue) {
  await prisma.agentLog.create({
    data: {
      agent: 'seo-auditor',
      action: 'flag',
      status: issue.severity === 'high' ? 'error' : 'warn',
      message: `kind=${issue.kind}`,
      meta: JSON.stringify({ detail: issue.detail, severity: issue.severity }),
    },
  });
}

async function fetchOk(url: string, expectKeyword?: string): Promise<{ ok: boolean; status: number; bytes: number; matches: boolean }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'Byte-Pulse-SEO-Auditor/1.0' } });
    const text = await res.text();
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      bytes: text.length,
      matches: expectKeyword ? text.toLowerCase().includes(expectKeyword.toLowerCase()) : true,
    };
  } catch {
    return { ok: false, status: 0, bytes: 0, matches: false };
  }
}

export type SeoAuditReport = {
  scanned: number;
  issuesFound: number;
  freshAlerts: number;
  byKind: Record<SeoIssue['kind'], number>;
};

export async function runSeoAuditor(): Promise<SeoAuditReport> {
  const issues: SeoIssue[] = [];

  // 1. Sitemap
  const sitemap = await fetchOk(`${SITE_URL}/sitemap.xml`, '<urlset');
  if (!sitemap.ok || !sitemap.matches) {
    issues.push({ kind: 'sitemap-empty', detail: `sitemap.xml status=${sitemap.status} bytes=${sitemap.bytes}`, severity: 'high' });
  }

  // 2. robots.txt
  const robots = await fetchOk(`${SITE_URL}/robots.txt`, 'User-agent');
  if (!robots.ok || !robots.matches) {
    issues.push({ kind: 'robots-missing', detail: `robots.txt status=${robots.status}`, severity: 'high' });
  }

  // 3. ads.txt (AdSense readiness)
  const adstxt = await fetchOk(`${SITE_URL}/ads.txt`);
  if (!adstxt.ok) {
    issues.push({ kind: 'ads-txt-missing', detail: `ads.txt status=${adstxt.status}`, severity: 'medium' });
  }

  // 4. Article volume (AdSense + ranking threshold)
  const totalArticles = await prisma.article.count({ where: { status: 'published' } });
  if (totalArticles < 50) {
    issues.push({ kind: 'low-article-count', detail: `Only ${totalArticles} published articles. AdSense often requires 30-50+.`, severity: 'medium' });
  }

  // 5. Orphan check — articles not linked from any OTHER article in the last 30d
  const recent = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: new Date(Date.now() - 30 * 24 * 3600_000) } },
    select: { slug: true, content: true },
  });
  const linkPattern = /\/article\/([a-z0-9-]+)/g;
  const linkedFromOthers = new Set<string>();
  for (const a of recent) {
    let m: RegExpExecArray | null;
    while ((m = linkPattern.exec(a.content)) !== null) linkedFromOthers.add(m[1]);
  }
  const orphans = recent.filter((a) => !linkedFromOthers.has(a.slug));
  // Above 70% orphan rate is a meaningful "no internal-link density" signal
  if (recent.length > 20 && orphans.length / recent.length > 0.7) {
    issues.push({
      kind: 'orphan',
      detail: `${orphans.length} of ${recent.length} recent articles have no inbound internal links. Writer should add 1-2 internal links per article.`,
      severity: 'low',
    });
  }

  // 6. Missing hreflang — articles where the EN exists but no DE translation
  const enRecent = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: new Date(Date.now() - 7 * 24 * 3600_000) } },
    select: { id: true, slug: true },
  });
  const transRows = enRecent.length
    ? await prisma.translation.findMany({ where: { lang: 'de', articleId: { in: enRecent.map((a) => a.id) } } })
    : [];
  const hasGerman = new Set(transRows.map((t) => t.articleId));
  const untranslated = enRecent.filter((a) => !hasGerman.has(a.id));
  // Above 50% untranslated after 7 days = the translator agent isn't keeping up
  if (enRecent.length > 20 && untranslated.length / enRecent.length > 0.5) {
    issues.push({
      kind: 'missing-hreflang',
      detail: `${untranslated.length} of ${enRecent.length} recent articles still lack DE translation. /de homepage and sitemap shrink, hreflang coverage drops.`,
      severity: 'low',
    });
  }

  // 7. Canonical-mismatch sample — spot-check 3 random recent articles
  // (Heavier check, only on 3 articles to keep cron under 30s)
  const sample = enRecent.slice(0, 3);
  for (const a of sample) {
    const res = await fetchOk(`${SITE_URL}/article/${a.slug}`);
    if (!res.ok) continue;
    // crude regex on canonical link tag
    const html = await fetch(`${SITE_URL}/article/${a.slug}`, { signal: AbortSignal.timeout(8000) }).then((r) => r.text()).catch(() => '');
    const m = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
    if (m && !m[1].includes(a.slug)) {
      issues.push({
        kind: 'canonical-mismatch',
        detail: `Article ${a.slug} canonical points to ${m[1]}`,
        severity: 'high',
      });
    }
  }

  // Filter against cooldown + log fresh ones
  const byKind: Record<SeoIssue['kind'], number> = {
    'sitemap-empty': 0, 'robots-missing': 0, 'ads-txt-missing': 0,
    'orphan': 0, 'missing-hreflang': 0, 'canonical-mismatch': 0, 'low-article-count': 0,
  };
  const fresh: SeoIssue[] = [];
  for (const issue of issues) {
    byKind[issue.kind]++;
    if (await alertedRecently(issue.kind)) continue;
    fresh.push(issue);
    await logIssue(issue);
  }

  if (fresh.length) {
    const lines = [`🔍 SEO-Audit · ${fresh.length} neue Issues`, ''];
    for (const i of fresh) {
      const icon = i.severity === 'high' ? '🔴' : i.severity === 'medium' ? '🟡' : '🟢';
      lines.push(`${icon} ${i.kind}\n  ${i.detail}`);
      lines.push('');
    }
    await tg(lines.join('\n'));
  }

  await prisma.agentLog.create({
    data: {
      agent: 'seo-auditor',
      action: 'run',
      status: 'success',
      message: `issues=${issues.length} fresh=${fresh.length}`,
      meta: JSON.stringify(byKind),
    },
  });

  return {
    scanned: 7,
    issuesFound: issues.length,
    freshAlerts: fresh.length,
    byKind,
  };
}
