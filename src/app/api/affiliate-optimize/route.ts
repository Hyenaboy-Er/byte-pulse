// Affiliate-Optimizer endpoint. Pinged by cron-job.org every 6h.
// Re-injects Amazon links into the last 14 days of published articles
// (idempotent — never duplicates a link).

import { NextResponse } from 'next/server';
import { runAffiliateOptimizer } from '@/lib/agents/affiliate-optimizer';

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

  const sinceDays = url.searchParams.get('days');
  const limit = url.searchParams.get('limit');
  const report = await runAffiliateOptimizer({
    sinceDays: sinceDays ? Number(sinceDays) : 14,
    limit: limit ? Number(limit) : 60,
  });
  return NextResponse.json({ ok: true, report });
}
