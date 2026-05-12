// Admin endpoint: GET /api/admin/social?token=<CRON_SECRET>
// Returns a JSON snapshot of social broadcast health per channel:
// - success count last 24h
// - failure count last 24h
// - last successful post per channel
// - currently-pending retries with attempt count and next-retry-at
//
// Useful for spotting "channel X broke" before posts pile up.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type ChannelStatus = {
  channel: string;
  successes24h: number;
  failures24h: number;
  pending: number;
  lastSuccessAt?: string;
  lastSuccessSlug?: string;
  lastErrorAt?: string;
  lastError?: string;
};

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const since24h = new Date(Date.now() - 24 * 3600_000);

  const rows = await prisma.agentLog.findMany({
    where: {
      agent: 'social',
      createdAt: { gte: since24h },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const byChannel = new Map<string, ChannelStatus>();
  const channelOf = (action: string) => {
    if (action === 'broadcast') return null; // aggregate row, skip
    const m = action.match(/^broadcast-(.+)$/);
    return m ? m[1] : null;
  };

  for (const r of rows) {
    const ch = channelOf(r.action);
    if (!ch) continue;
    if (!byChannel.has(ch)) {
      byChannel.set(ch, { channel: ch, successes24h: 0, failures24h: 0, pending: 0 });
    }
    const stat = byChannel.get(ch)!;
    if (r.status === 'success') {
      stat.successes24h++;
      if (!stat.lastSuccessAt) {
        stat.lastSuccessAt = r.createdAt.toISOString();
        stat.lastSuccessSlug = (r.message ?? '').split('|')[0] || undefined;
      }
    } else if (r.status === 'error') {
      stat.failures24h++;
      if (!stat.lastErrorAt) {
        stat.lastErrorAt = r.createdAt.toISOString();
        stat.lastError = r.message?.slice(0, 200);
      }
      // Check if this row is still pending (not yet abandoned)
      try {
        const meta = JSON.parse(r.meta ?? '{}') as { attempts?: number; abandoned?: string };
        if ((meta.attempts ?? 1) < 5 && !meta.abandoned) stat.pending++;
      } catch {}
    }
  }

  // Total successful broadcast aggregate rows (orchestrator-level)
  const totals = await prisma.agentLog.count({
    where: { agent: 'social', action: 'broadcast', status: 'success', createdAt: { gte: since24h } },
  });

  return NextResponse.json({
    ok: true,
    window: '24h',
    totalSuccessfulBroadcasts: totals,
    channels: Array.from(byChannel.values()).sort((a, b) => b.successes24h - a.successes24h),
  });
}
