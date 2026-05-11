// Telegram digest endpoint. Pinged every 4h by cron-job.org. Idempotent
// (re-running it sends another digest — schedule it correctly at cron level).
// Manual call sends an out-of-band digest, useful for "how are we doing right now".
//
//   GET /api/stats?token=$CRON_SECRET[&hours=4][&silent=1]

import { NextResponse } from 'next/server';
import { runStatsReporter } from '@/lib/agents/stats-reporter';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const hoursParam = url.searchParams.get('hours');
  const windowHours = hoursParam ? Math.max(1, Math.min(168, Number(hoursParam))) : 4;
  const silent = url.searchParams.get('silent') === '1';

  const stats = await runStatsReporter({ windowHours, silent });
  return NextResponse.json({ ok: true, stats });
}
