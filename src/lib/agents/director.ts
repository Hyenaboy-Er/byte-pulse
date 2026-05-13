// Director — agent #23, the 'Master of Operations' the user asked for.
//
// Sentinel is operational: runs every 5 min, auto-fixes individual issues,
// alerts on Telegram when things break.
// Director is strategic: runs ONCE a day (suggested 07:00 local), inspects
// the state of all 22 other agents over the last 24h, identifies systemic
// gaps ('Internal-Linker has only run once in 4 days', 'Backlink-Hunter
// finds threads but we never act on them', 'most articles still don't
// have any internal links'), and sends a single coordinated 'state of
// the union' to Telegram.
//
// The Director does NOT auto-fix. It surfaces priorities. The user (or the
// other agents on their next cron) acts on those priorities.

import { prisma } from '../db';
import { tg } from '../telegram';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';

export type DirectorReport = {
  generatedAt: string;
  agents: AgentHealth[];
  systemicIssues: string[];
  priorities: string[];
  contentStats: {
    totalPublished: number;
    publishedToday: number;
    publishedLast7d: number;
    averageWordsPerArticle: number | null;
    deTranslationCoverage: number;
    articlesWithInternalLinks: number;
    articlesWithAmazonCTA: number;
  };
  growthStats: {
    totalViews: number;
    topArticleViews: number;
    topArticleSlug: string | null;
  };
};

type AgentHealth = {
  name: string;
  lastRun: string | null;
  expectedFrequencyHours: number;
  status: 'healthy' | 'stale' | 'idle' | 'errored';
  runsLast24h: number;
  errorsLast24h: number;
  note?: string;
};

// Every agent we expect to see activity from, and how often.
// expectedFrequencyHours: max time we tolerate between runs before flagging 'stale'.
const EXPECTED_AGENTS: { name: string; agentLogKey: string; freqH: number; note?: string }[] = [
  { name: 'Writer (Orchestrator)', agentLogKey: 'orchestrator', freqH: 1, note: 'every 30 min via cron' },
  { name: 'Translator', agentLogKey: 'translator', freqH: 2, note: 'after each publish' },
  { name: 'Quality-Auditor', agentLogKey: 'quality-auditor', freqH: 6, note: 'every 3h cron' },
  { name: 'SEO-Auditor', agentLogKey: 'seo-auditor', freqH: 12, note: 'every 6h cron' },
  { name: 'Site-Monitor', agentLogKey: 'site-monitor', freqH: 1, note: 'every 15min cron' },
  { name: 'Stats-Reporter', agentLogKey: 'stats-reporter', freqH: 8, note: 'every 4h cron' },
  { name: 'Affiliate-Optimizer', agentLogKey: 'affiliate-optimizer', freqH: 12, note: 'every 6h cron' },
  { name: 'Backlink-Hunter', agentLogKey: 'backlink-hunter', freqH: 8, note: 'every 4h cron' },
  { name: 'Content-Refresher', agentLogKey: 'content-refresher', freqH: 30, note: 'daily 03:00' },
  { name: 'Internal-Linker', agentLogKey: 'internal-linker', freqH: 14, note: 'every 12h cron' },
  { name: 'Title-Booster', agentLogKey: 'title-booster', freqH: 30, note: 'daily 04:00 cron' },
  { name: 'Trend-Reactor', agentLogKey: 'trend-reactor', freqH: 1, note: 'every 15min cron' },
  { name: 'GSC-Monitor', agentLogKey: 'gsc-monitor', freqH: 30, note: 'daily 09:00 (needs GSC_SERVICE_ACCOUNT_KEY)' },
  { name: 'Social-Retry', agentLogKey: 'social-retry', freqH: 1, note: 'every 5min cron' },
  { name: 'Social-Broadcast', agentLogKey: 'social', freqH: 1, note: 'after each publish' },
  { name: 'Sentinel', agentLogKey: 'sentinel', freqH: 1, note: 'every 5min cron' },
  { name: 'IndexNow', agentLogKey: 'indexnow', freqH: 2, note: 'after each publish' },
  { name: 'Email-Watcher', agentLogKey: 'email-watcher', freqH: 1, note: 'waits for GMAIL_IMAP creds' },
];

async function agentHealthRow(spec: typeof EXPECTED_AGENTS[number]): Promise<AgentHealth> {
  const since = new Date(Date.now() - 24 * 3600_000);
  const since48 = new Date(Date.now() - 48 * 3600_000);

  const [runs24, errors24, lastRun] = await Promise.all([
    prisma.agentLog.count({ where: { agent: spec.agentLogKey, createdAt: { gte: since } } }),
    prisma.agentLog.count({ where: { agent: spec.agentLogKey, status: 'error', createdAt: { gte: since } } }),
    prisma.agentLog.findFirst({
      where: { agent: spec.agentLogKey, createdAt: { gte: since48 } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  let status: AgentHealth['status'];
  const ageH = lastRun ? (Date.now() - lastRun.createdAt.getTime()) / 3600_000 : Infinity;
  if (!lastRun) status = 'idle';
  else if (ageH > spec.freqH * 1.5) status = 'stale';
  else if (errors24 > runs24 / 2 && errors24 >= 3) status = 'errored';
  else status = 'healthy';

  return {
    name: spec.name,
    lastRun: lastRun?.createdAt.toISOString() ?? null,
    expectedFrequencyHours: spec.freqH,
    status,
    runsLast24h: runs24,
    errorsLast24h: errors24,
    note: spec.note,
  };
}

// Walk the content corpus and surface systemic gaps.
async function detectSystemicIssues(): Promise<string[]> {
  const issues: string[] = [];
  const since24h = new Date(Date.now() - 24 * 3600_000);
  const since7d = new Date(Date.now() - 7 * 24 * 3600_000);

  // Issue 1: % of articles WITHOUT a DE translation
  const totalPublished = await prisma.article.count({ where: { status: 'published' } });
  const translated = await prisma.translation.count({ where: { lang: 'de' } });
  const dePct = totalPublished > 0 ? translated / totalPublished : 1;
  if (dePct < 0.8 && totalPublished > 30) {
    issues.push(`Only ${Math.round(dePct * 100)}% of published articles have a DE translation (${totalPublished - translated} missing)`);
  }

  // Issue 2: articles missing internal links (we can detect by scanning content for /article/ links)
  const recent = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: since7d } },
    select: { id: true, slug: true, content: true },
    take: 300,
  });
  const noInternalLinks = recent.filter((a) => !/\]\(\/article\/[a-z0-9-]+\)/.test(a.content)).length;
  if (recent.length > 0 && noInternalLinks / recent.length > 0.3) {
    issues.push(`${noInternalLinks}/${recent.length} articles in last 7d have NO internal links — run /api/internal-link?sinceDays=7`);
  }

  // Issue 3: articles missing Amazon CTA / affiliate link
  // Heuristic: scan a sample for amazon tag in content (Affiliate-Optimizer mostly injects in body)
  const samplesNoAmazon = recent.filter((a) => !/amazon\.[a-z]+\/.*?tag=bytepulse/.test(a.content)).length;
  if (recent.length > 0 && samplesNoAmazon / recent.length > 0.6) {
    issues.push(`${samplesNoAmazon}/${recent.length} recent articles don't have an inline Amazon link — Affiliate-Optimizer keyword list may be too narrow`);
  }

  // Issue 4: Broadcast volume vs publish volume mismatch
  const publishCount = await prisma.article.count({ where: { status: 'published', publishedAt: { gte: since24h } } });
  const broadcastCount = await prisma.agentLog.count({
    where: { agent: 'social', action: 'broadcast', status: 'success', createdAt: { gte: since24h } },
  });
  if (publishCount > 5 && broadcastCount < publishCount * 0.5) {
    issues.push(`${publishCount} articles published in 24h but only ${broadcastCount} broadcast rounds — social channels likely broken`);
  }

  // Issue 5: Sentinel never fired today — meaning user hasn't set up the cron-job
  const sentinelToday = await prisma.agentLog.count({
    where: { agent: 'sentinel', createdAt: { gte: since24h } },
  });
  if (sentinelToday === 0) {
    issues.push(`Sentinel agent has not run in 24h — verify cron-job.org has the /api/sentinel job scheduled every 5 min`);
  }

  // Issue 6: Newsletter still paused
  const subs = await prisma.newsletterSubscriber.count();
  if (subs === 0) {
    issues.push(`Newsletter has 0 subscribers — likely still paused. Re-enable once Resend + business email are configured.`);
  }

  return issues;
}

// Decide what the user should focus on in the next 24h.
function buildPriorities(agents: AgentHealth[], systemic: string[]): string[] {
  const out: string[] = [];

  // Highest priority: errored agents
  for (const a of agents) {
    if (a.status === 'errored') {
      out.push(`FIX: ${a.name} has ${a.errorsLast24h} errors in 24h. Check agentLog action=error agent=${a.name.toLowerCase()}`);
    }
  }
  // Then stale agents that should be running but aren't
  for (const a of agents) {
    if (a.status === 'stale') {
      out.push(`WAKE: ${a.name} last ran > ${Math.round(a.expectedFrequencyHours * 1.5)}h ago. ${a.note ?? ''}`);
    }
  }
  // Then idle agents (never ran in 48h) that need setup
  for (const a of agents) {
    if (a.status === 'idle') {
      out.push(`SETUP: ${a.name} has never run. ${a.note ?? ''}`);
    }
  }
  // Systemic issues are also priorities
  for (const s of systemic) out.push(`STRATEGIC: ${s}`);

  return out.slice(0, 10);
}

export async function runDirector(): Promise<DirectorReport> {
  const agents = await Promise.all(EXPECTED_AGENTS.map(agentHealthRow));
  const systemic = await detectSystemicIssues();
  const priorities = buildPriorities(agents, systemic);

  // Content stats
  const since24h = new Date(Date.now() - 24 * 3600_000);
  const since7d = new Date(Date.now() - 7 * 24 * 3600_000);
  const [totalPublished, publishedToday, published7d, translated, articles] = await Promise.all([
    prisma.article.count({ where: { status: 'published' } }),
    prisma.article.count({ where: { status: 'published', publishedAt: { gte: since24h } } }),
    prisma.article.count({ where: { status: 'published', publishedAt: { gte: since7d } } }),
    prisma.translation.count({ where: { lang: 'de' } }),
    prisma.article.findMany({
      where: { status: 'published', publishedAt: { gte: since7d } },
      select: { content: true },
      take: 200,
    }),
  ]);

  const totalWords = articles.reduce((sum, a) => sum + a.content.split(/\s+/).length, 0);
  const articlesWithInternalLinks = articles.filter((a) => /\]\(\/article\/[a-z0-9-]+\)/.test(a.content)).length;
  const articlesWithAmazonCTA = articles.filter((a) => /amazon\.[a-z]+\/.*?tag=bytepulse/.test(a.content)).length;

  const topByViews = await prisma.article.findFirst({
    where: { status: 'published' },
    orderBy: { views: 'desc' },
    select: { slug: true, views: true },
  });
  const totalViews = (await prisma.article.aggregate({ _sum: { views: true } }))._sum.views ?? 0;

  const report: DirectorReport = {
    generatedAt: new Date().toISOString(),
    agents,
    systemicIssues: systemic,
    priorities,
    contentStats: {
      totalPublished,
      publishedToday,
      publishedLast7d: published7d,
      averageWordsPerArticle: articles.length ? Math.round(totalWords / articles.length) : null,
      deTranslationCoverage: totalPublished ? Math.round((translated / totalPublished) * 100) : 0,
      articlesWithInternalLinks,
      articlesWithAmazonCTA,
    },
    growthStats: {
      totalViews,
      topArticleViews: topByViews?.views ?? 0,
      topArticleSlug: topByViews?.slug ?? null,
    },
  };

  // Render the Telegram message
  const healthy = agents.filter((a) => a.status === 'healthy').length;
  const lines: string[] = [
    `Director · Tagesreport ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    '',
    `AGENT-GESUNDHEIT: ${healthy}/${agents.length} healthy`,
  ];
  const problems = agents.filter((a) => a.status !== 'healthy');
  if (problems.length) {
    lines.push('');
    for (const a of problems) {
      lines.push(`  ${a.status.toUpperCase()}: ${a.name} (${a.runsLast24h} runs/24h, ${a.errorsLast24h} errors)`);
    }
  }
  lines.push('');
  lines.push(`CONTENT: ${report.contentStats.publishedToday} heute, ${report.contentStats.publishedLast7d} in 7 Tagen, ${report.contentStats.totalPublished} total`);
  lines.push(`  DE-Translation: ${report.contentStats.deTranslationCoverage}% Coverage`);
  if (report.contentStats.averageWordsPerArticle) {
    lines.push(`  Wortzahl: durchschnittlich ${report.contentStats.averageWordsPerArticle}/Artikel (Ziel: 900-1300)`);
  }
  lines.push(`  Internal Links: ${report.contentStats.articlesWithInternalLinks}/${articles.length} (letzte 7 Tage)`);
  lines.push(`  Amazon-CTA inline: ${report.contentStats.articlesWithAmazonCTA}/${articles.length} (letzte 7 Tage)`);
  lines.push('');
  lines.push(`TRAFFIC: ${report.growthStats.totalViews} total views, Top-Artikel ${report.growthStats.topArticleViews} (${report.growthStats.topArticleSlug?.slice(0, 50) ?? '-'})`);

  if (priorities.length > 0) {
    lines.push('');
    lines.push('PRIORITAETEN (top ' + Math.min(priorities.length, 6) + '):');
    for (const p of priorities.slice(0, 6)) {
      lines.push('  - ' + p);
    }
  } else {
    lines.push('');
    lines.push('Alles im gruenen Bereich. Keine offenen Prioritaeten.');
  }

  await tg(lines.join('\n'));

  // Persist a marker so other agents can read 'when did the Director last run'
  await prisma.agentLog.create({
    data: {
      agent: 'director',
      action: 'daily-report',
      status: 'success',
      message: `${healthy}/${agents.length} healthy · ${priorities.length} priorities`,
      meta: JSON.stringify({ priorities: priorities.slice(0, 5) }),
    },
  }).catch(() => null);

  return report;
}
