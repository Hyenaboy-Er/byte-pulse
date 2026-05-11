// Backlink-Hunter endpoint. Pinged by cron-job.org every 4-6h.

import { NextResponse } from 'next/server';
import { runBacklinkHunter } from '@/lib/agents/backlink-hunter';

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
  const report = await runBacklinkHunter();
  return NextResponse.json({ ok: true, report });
}
