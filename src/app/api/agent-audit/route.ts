// Agent-Auditor endpoint. Meta-watchdog: audits whether every agent is
// producing GOOD WORK (real outcome metrics), not just "ran 200".
// CRON_SECRET-gated. Fired by the daily fan-out; callable on demand.

import { NextResponse } from 'next/server';
import { runAgentAuditor } from '@/lib/agents/agent-auditor';

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
  const report = await runAgentAuditor();
  return NextResponse.json({ ok: true, report });
}
