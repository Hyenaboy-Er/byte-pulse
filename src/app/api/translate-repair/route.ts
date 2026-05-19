// Translation-Repair endpoint. Scans cached DE translations, finds the
// ones truncated by the old maxTokens:4000 bug, deletes + regenerates them
// through the now-gated translator. Bounded per call (LLM cost + 60s cap).

import { NextResponse } from 'next/server';
import { runTranslationRepair } from '@/lib/agents/translation-repair';

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
  const max = url.searchParams.get('max');
  const report = await runTranslationRepair({ max: max ? Number(max) : undefined });
  return NextResponse.json({ ok: true, report });
}
