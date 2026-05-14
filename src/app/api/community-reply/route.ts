// Community-Replies endpoint — runs the Mastodon community-bot.
// Schedule on cron-job.org: /api/community-reply  every 15 minutes.
//
// Why 15 min instead of 5 min: writing thoughtful replies costs LLM tokens
// and threads slow down naturally — a tighter cadence wouldn't actually
// reach the audience any faster.
import { NextResponse } from 'next/server';
import { runCommunityReplies } from '@/lib/agents/community-replies';

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
  const report = await runCommunityReplies();
  return NextResponse.json({ ok: true, report });
}
