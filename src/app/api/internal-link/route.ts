import { NextResponse } from 'next/server';
import { runInternalLinker } from '@/lib/agents/internal-linker';

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
  const sinceDays = url.searchParams.get('sinceDays');
  const limit = url.searchParams.get('limit');
  const report = await runInternalLinker({
    sinceDays: sinceDays ? Number(sinceDays) : 30,
    limit: limit ? Number(limit) : 30,
  });
  return NextResponse.json({ ok: true, report });
}
