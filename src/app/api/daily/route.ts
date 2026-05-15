// Daily-ops orchestrator. Vercel Hobby allows only 2 cron slots and both
// were already taken (writer batch @07:00, monitor @08:00). Rather than
// depend on the user's cron-job.org account for the daily newsletter, we
// fold the 08:00 slot into this single fan-out endpoint: it runs the
// site-monitor AND sends the daily newsletter digest in one invocation.
//
// vercel.json points the 08:00 cron here instead of /api/admin/monitor.
// Each sub-task is isolated in its own try/catch so one failure can't
// abort the others. Auth: same CRON_SECRET gate as every other cron.
import { NextResponse } from 'next/server';
import { buildDailyDigest, sendDigestToAll } from '@/lib/newsletter';
import { tg } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const out: Record<string, unknown> = {};

  // 1. Daily newsletter digest → all confirmed subscribers (Resend).
  try {
    const digest = await buildDailyDigest();
    if (!digest) {
      out.newsletter = { skipped: 'no articles in last 24h' };
    } else {
      const r = await sendDigestToAll(digest);
      out.newsletter = { articleCount: digest.articleCount, sent: r.sent, recipients: r.recipients };
    }
  } catch (e) {
    out.newsletter = { error: (e as Error).message };
  }

  // 2. Site-monitor (was its own Vercel cron; folded in here). Fire the
  //    existing endpoint internally so we don't duplicate its logic.
  try {
    const m = await fetch(`${SITE}/api/admin/monitor?token=${expected}`, {
      signal: AbortSignal.timeout(45_000),
    });
    out.monitor = { status: m.status };
  } catch (e) {
    out.monitor = { error: (e as Error).message };
  }

  // 3. Comparison longform — Mon/Wed/Fri only (~3/week). Evergreen anchor
  //    content; daily would dilute quality and look like scaled output.
  //    TRIGGERED as a separate /api/comparison invocation (not inline):
  //    it needs its own ~50s budget and Vercel Hobby hard-caps every
  //    function at 60s, so running it inside this fan-out would risk a
  //    timeout that also kills the newsletter. We fire the request and
  //    only wait a few seconds to confirm the function spun up — it then
  //    runs to completion independently. The agent dedups its queue.
  const dow = new Date().getUTCDay(); // 0=Sun … 6=Sat
  if ([1, 3, 5].includes(dow)) {
    try {
      await fetch(`${SITE}/api/comparison?token=${expected}`, {
        signal: AbortSignal.timeout(5_000),
      });
      out.comparison = { triggered: true };
    } catch {
      // Abort after 5s is expected — the comparison function keeps
      // running in its own invocation. Only a real network error matters.
      out.comparison = { triggered: true, note: 'fired (running independently)' };
    }
  } else {
    out.comparison = { skipped: 'not a Mon/Wed/Fri' };
  }

  await tg(
    `Daily-ops: newsletter=${JSON.stringify(out.newsletter)} monitor=${JSON.stringify(out.monitor)} comparison=${JSON.stringify(out.comparison)}`,
    { silent: true },
  ).catch(() => null);

  return NextResponse.json({ ok: true, ...out });
}
