// Sentinel endpoint — runs every 5 minutes via cron-job.org.
// Returns the full report as JSON so we can also call it manually
// from a browser and see the state of the system.

import { NextResponse } from 'next/server';
import { runSentinel } from '@/lib/agents/sentinel';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const report = await runSentinel();
  return NextResponse.json({ ok: true, report });
}
