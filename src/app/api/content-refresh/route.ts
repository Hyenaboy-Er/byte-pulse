// Content-Refresher endpoint. Runs every 12-24h. Refreshes up to 3 high-traffic
// older articles per call with a fresh "Update" paragraph + bumps publishedAt.

import { NextResponse } from 'next/server';
import { runContentRefresher } from '@/lib/agents/content-refresher';

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
  const max = url.searchParams.get('max');
  const views = url.searchParams.get('minViews');
  const report = await runContentRefresher({
    maxPerRun: max ? Number(max) : 3,
    minViews: views ? Number(views) : 30,
  });
  return NextResponse.json({ ok: true, report });
}
