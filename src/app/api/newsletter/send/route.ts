import { NextResponse } from 'next/server';
import { buildDailyDigest, sendDigestToAll } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  const dryRun = url.searchParams.get('dryRun') === '1';

  if (expected && auth !== `Bearer ${expected}` && tokenFromQuery !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const digest = await buildDailyDigest();
  if (!digest) return NextResponse.json({ ok: true, message: 'No new articles in 24h — nothing to send.' });

  const result = await sendDigestToAll(digest, { dryRun });
  const { ok: _ok, ...rest } = result;
  return NextResponse.json({ ok: true, articleCount: digest.articleCount, ...rest });
}
