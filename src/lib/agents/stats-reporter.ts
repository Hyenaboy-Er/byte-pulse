// Stats-Reporter agent — sends a digest of pipeline + traffic + monetization
// stats to the operator's Telegram chat every 4 hours. Stateless (queries the
// DB on each run) and idempotent (cooldown via the cron schedule itself, not
// in-DB). Designed to give the operator a heartbeat without needing to open
// a dashboard.

import { prisma } from '../db';
import { tg } from '../telegram';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';

type DigestStats = {
  windowHours: number;
  publishedInWindow: number;
  publishedToday: number;
  totalArticles: number;
  totalViews: number;
  topByViews: { title: string; views: number; slug: string }[];
  recentByPublish: { title: string; publishedAt: Date | null; slug: string }[];
  publishErrors: number;
  dedupRejects: number;
  fallbackAlerts: number;
  newsletterSubs: number;
  siteMonitorAlerts: number;
  emailWatcherAlerts: number;
};

function fmtPct(num: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((num / total) * 100)}%`;
}

export async function runStatsReporter(opts?: { windowHours?: number; silent?: boolean }): Promise<DigestStats> {
  const windowHours = opts?.windowHours ?? 4;
  const windowMs = windowHours * 3600 * 1000;
  const since = new Date(Date.now() - windowMs);
  const since24h = new Date(Date.now() - 24 * 3600_000);

  const [publishedInWindow, publishedToday, totalArticles, topByViews, recentByPublish, publishErrors, dedupRejects, fallbackAlerts, newsletterSubs, siteMonitorAlerts, emailWatcherAlerts] = await Promise.all([
    prisma.article.count({ where: { status: 'published', publishedAt: { gte: since } } }),
    prisma.article.count({ where: { status: 'published', publishedAt: { gte: since24h } } }),
    prisma.article.count({ where: { status: 'published' } }),
    prisma.article.findMany({
      where: { status: 'published', publishedAt: { gte: since24h } },
      orderBy: { views: 'desc' },
      take: 5,
      select: { title: true, views: true, slug: true },
    }),
    prisma.article.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { title: true, publishedAt: true, slug: true },
    }),
    prisma.agentLog.count({ where: { agent: { in: ['writer', 'humanizer', 'reviewer', 'orchestrator'] }, status: 'error', createdAt: { gte: since } } }),
    prisma.agentLog.count({ where: { agent: 'orchestrator', action: 'dedup', createdAt: { gte: since } } }),
    prisma.agentLog.count({ where: { agent: 'llm', action: 'fallback', createdAt: { gte: since } } }),
    prisma.newsletterSubscriber.count({ where: { confirmed: true } }).catch(() => 0),
    prisma.agentLog.count({ where: { agent: 'site-monitor', action: 'alert', createdAt: { gte: since } } }),
    prisma.agentLog.count({ where: { agent: 'email-watcher', action: 'poll', createdAt: { gte: since } } }),
  ]);

  // Sum total views across all published articles
  const viewAgg = await prisma.article.aggregate({ where: { status: 'published' }, _sum: { views: true } });
  const totalViews = viewAgg._sum.views ?? 0;

  const stats: DigestStats = {
    windowHours,
    publishedInWindow,
    publishedToday,
    totalArticles,
    totalViews,
    topByViews,
    recentByPublish,
    publishErrors,
    dedupRejects,
    fallbackAlerts,
    newsletterSubs,
    siteMonitorAlerts,
    emailWatcherAlerts,
  };

  if (opts?.silent) return stats;

  // Format compact Telegram message — designed to fit one notification view
  const lines: string[] = [];
  lines.push(`📊 Byte-Pulse · letzte ${windowHours}h`);
  lines.push('');
  lines.push(`Publiziert: ${publishedInWindow} (24h: ${publishedToday}) · Total: ${totalArticles}`);
  lines.push(`Views gesamt: ${totalViews.toLocaleString('de-DE')}`);
  if (publishErrors > 0 || siteMonitorAlerts > 0) {
    lines.push(`⚠ Fehler ${publishErrors} · Site-Alerts ${siteMonitorAlerts}`);
  } else {
    lines.push(`✅ Keine Fehler, keine Site-Alerts`);
  }
  lines.push(`Dedup-Reject: ${dedupRejects} ${dedupRejects > 0 ? `(${fmtPct(dedupRejects, dedupRejects + publishedInWindow)} Picks)` : ''}`);
  if (fallbackAlerts > 0) lines.push(`LLM-Fallback ausgelöst: ${fallbackAlerts}× (Gemini→OpenAI)`);
  lines.push(`Newsletter-Subs: ${newsletterSubs}`);
  lines.push('');

  if (topByViews.length) {
    lines.push(`🔥 Top 5 (letzte 24h):`);
    topByViews.forEach((a, i) => {
      const views = a.views.toLocaleString('de-DE');
      lines.push(`${i + 1}. [${views}] ${a.title.slice(0, 65)}${a.title.length > 65 ? '…' : ''}`);
    });
    lines.push('');
  }
  if (recentByPublish.length) {
    lines.push(`🆕 Zuletzt publiziert:`);
    recentByPublish.forEach((a) => {
      const ago = a.publishedAt ? Math.round((Date.now() - a.publishedAt.getTime()) / 60_000) : '?';
      lines.push(`  · ${a.title.slice(0, 70)} (vor ${ago} Min)`);
    });
  }
  lines.push('');
  lines.push(SITE_URL);

  await tg(lines.join('\n'));

  await prisma.agentLog.create({
    data: {
      agent: 'stats-reporter',
      action: 'digest',
      status: 'success',
      message: `pub=${publishedInWindow}/${publishedToday} views=${totalViews} errs=${publishErrors}`,
      meta: JSON.stringify({ topByViews: topByViews.map((a) => ({ slug: a.slug, views: a.views })) }),
    },
  });

  return stats;
}
