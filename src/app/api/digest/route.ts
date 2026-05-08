// Daily digest — auth-gated. Sends a Telegram morning briefing with yesterday's stats.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { tg, formatDigest } from '@/lib/telegram';
import { getCurrentTrends } from '@/lib/agents/keyword-research';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}` && tokenFromQuery !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const yesterdayStart = new Date(Date.now() - 24 * 3600_000);

  const [yesterdayPublished, yesterdayErrors, total, topArticles, monitorFlags, trends] = await Promise.all([
    prisma.article.count({ where: { status: 'published', publishedAt: { gte: yesterdayStart } } }),
    prisma.agentLog.count({ where: { status: 'error', createdAt: { gte: yesterdayStart } } }),
    prisma.article.count({ where: { status: 'published' } }),
    prisma.article.findMany({
      where: { status: 'published', publishedAt: { gte: yesterdayStart } },
      orderBy: { views: 'desc' },
      take: 5,
      select: { title: true, views: true, slug: true },
    }),
    prisma.agentLog.count({ where: { agent: 'monitor', status: 'warning', createdAt: { gte: yesterdayStart } } }),
    getCurrentTrends().catch(() => null),
  ]);

  const digest = formatDigest({
    yesterdayPublished,
    yesterdayErrors,
    total,
    topArticles,
    monitorFlags,
    trendsSnapshot: trends?.topics?.slice(0, 8),
  });

  const result = await tg(digest, { silent: false });
  return NextResponse.json({ ok: result.ok, digest, sent: result.ok, error: result.error });
}
