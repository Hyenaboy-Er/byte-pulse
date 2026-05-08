import { NextResponse } from 'next/server';
import { runMonitor } from '@/lib/agents/monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const checkLinks = url.searchParams.get('links') !== '0';
  const llmFactcheck = url.searchParams.get('factcheck') === '1';
  const hoursBack = Number(url.searchParams.get('hours') ?? 24);
  const report = await runMonitor({ hoursBack, checkLinks, llmFactcheck });
  return NextResponse.json({ ok: true, report });
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}` && tokenFromQuery !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const report = await runMonitor({ hoursBack: 24, checkLinks: true, llmFactcheck: true });
  return NextResponse.json({ ok: true, report });
}
