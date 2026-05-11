// Quality-Audit endpoint. Pinged every 2-3 hours by cron-job.org. Scans the
// last sinceHours of published articles, runs heuristic + LLM checks, alerts
// Telegram on fresh issues with a 6h per-(slug,kind) cooldown.
//
//   GET /api/quality-audit?token=$CRON_SECRET[&hours=12][&limit=12]

import { NextResponse } from 'next/server';
import { runQualityAuditor } from '@/lib/agents/quality-auditor';

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
  const hoursParam = url.searchParams.get('hours');
  const limitParam = url.searchParams.get('limit');
  const report = await runQualityAuditor({
    sinceHours: hoursParam ? Number(hoursParam) : 12,
    limit: limitParam ? Number(limitParam) : 12,
  });
  return NextResponse.json({ ok: true, report });
}
