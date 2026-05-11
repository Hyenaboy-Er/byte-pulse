// Polls Gmail INBOX for operational alerts (Search Console, AdSense, Vercel,
// OpenAI, Amazon, etc.) and forwards summaries to Telegram. Designed to run on
// a 30-minute cron from cron-job.org. Returns 200 even when GMAIL_IMAP_USER is
// unset so the cron doesn't go red during early onboarding.
//
//   GET /api/email-watch?token=$CRON_SECRET[&hours=24]
//   Authorization: Bearer $CRON_SECRET  (alternative)
//
// The endpoint is idempotent — re-running it on the same inbox window will not
// re-alert on any Message-ID already in the EmailSeen table.

import { NextResponse } from 'next/server';
import { runEmailWatcher } from '@/lib/agents/email-watcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;

  if (expected && auth !== `Bearer ${expected}` && tokenFromQuery !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const hoursParam = url.searchParams.get('hours');
  const sinceHours = hoursParam ? Math.max(1, Math.min(168, Number(hoursParam))) : 24;

  const report = await runEmailWatcher({ sinceHours });
  return NextResponse.json(report, { status: report.ok ? 200 : 502 });
}
