// Comparison/buying-guide longform endpoint (agent #25).
// Cron a few times a week (these are evergreen — daily would dilute
// quality and look like scaled content). Optional ?a=&b=&category=
// to force a specific matchup on demand.
import { NextResponse } from 'next/server';
import { runComparisonWriter } from '@/lib/agents/comparison-writer';

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

  const a = url.searchParams.get('a');
  const b = url.searchParams.get('b');
  const category = url.searchParams.get('category') ?? 'mobile';
  const override = a && b ? { a, b, category } : undefined;

  const report = await runComparisonWriter(override);
  return NextResponse.json({ ok: !report.error, report });
}
