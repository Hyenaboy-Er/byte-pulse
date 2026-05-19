// AdSense-Robo endpoint. The consolidating control brain: checks + auto-
// fixes content/indexing/quality and escalates only the unfixable.
// CRON_SECRET-gated. Fired by the daily fan-out; also callable on demand.

import { NextResponse } from 'next/server';
import { runAdsenseRobo } from '@/lib/agents/adsense-robo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby hard cap; controller fires heavy work, never runs it inline

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const report = await runAdsenseRobo();
  return NextResponse.json({ ok: true, report });
}
