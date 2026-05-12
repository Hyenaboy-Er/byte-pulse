// Title-Booster endpoint. Rewrites weak article titles to click-magnet form
// without inventing facts. Runs on-demand or via cron (suggested: daily 04:00).

import { NextResponse } from 'next/server';
import { runTitleBooster } from '@/lib/agents/title-booster';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const limit = url.searchParams.get('limit');
  const minViews = url.searchParams.get('minViews');
  const force = url.searchParams.get('force') === '1';
  const report = await runTitleBooster({
    limit: limit ? Number(limit) : 25,
    minViews: minViews ? Number(minViews) : 5,
    force,
  });
  return NextResponse.json({ ok: true, report });
}
