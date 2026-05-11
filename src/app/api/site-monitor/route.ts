// Public-health monitor. Pinged by cron-job.org every 15 minutes — separate
// schedule from /api/cron (writer) and /api/email-watch (gmail). Returns the
// per-target sample so the operator can also call it manually as a "show me
// the homepage perf right now" diagnostic.

import { NextResponse } from 'next/server';
import { runSiteMonitor } from '@/lib/agents/site-monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}` && tokenFromQuery !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const report = await runSiteMonitor();
  return NextResponse.json(report);
}
