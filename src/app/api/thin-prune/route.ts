// Thin-Pruner endpoint. De-indexes genuinely worthless thin legacy
// articles (Google's "improve OR remove" guidance) to legitimately
// raise AdSense readiness. CRON_SECRET-gated. Hard guardrails live in
// the agent. Fired by the daily fan-out; callable on demand with ?max=.

import { NextResponse } from 'next/server';
import { runThinPruner } from '@/lib/agents/thin-pruner';

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
  const max = url.searchParams.get('max');
  const report = await runThinPruner({ max: max ? Number(max) : undefined });
  return NextResponse.json({ ok: true, report });
}
