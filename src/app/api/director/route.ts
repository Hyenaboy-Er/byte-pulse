// Director endpoint — strategischer Tagesreport. Cron-schedule: 1x täglich 07:00.
import { NextResponse } from 'next/server';
import { runDirector } from '@/lib/agents/director';

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
  const report = await runDirector();
  return NextResponse.json({ ok: true, report });
}
