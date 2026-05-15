// Quality-Upgrade endpoint (agent #26). Rewrites thin pre-fix articles
// into substantial 900-1300w pieces — the AdSense-readiness lever.
// Triggered daily from /api/daily; optional ?max=N override.
import { NextResponse } from 'next/server';
import { runQualityUpgrade } from '@/lib/agents/quality-upgrade';

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
  const maxParam = url.searchParams.get('max');
  const report = await runQualityUpgrade({ maxPerRun: maxParam ? Number(maxParam) : undefined });
  return NextResponse.json({ ok: true, report });
}
