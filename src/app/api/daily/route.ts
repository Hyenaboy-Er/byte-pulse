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
import { SITE as SITE_CONFIG } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Local `SITE` is the base URL string used by the fan-out fetches; source
// it from the central keystone (aliased to avoid shadowing the config).
const SITE = SITE_CONFIG.url;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const out: Record<string, unknown> = {};

  // 1. Newsletter digest — Mon/Wed/Fri only (~3×/week, the "5 best
  //    recommendations"). A curated tri-weekly beats a forced daily:
  //    higher signal, honest expectation, better open rates, less
  //    unsubscribe/spam risk. The signup copy promises exactly this.
  const dow = new Date().getUTCDay(); // 0=Sun … 6=Sat
  if ([1, 3, 5].includes(dow)) {
    try {
      const digest = await buildDailyDigest();
      if (!digest) {
        out.newsletter = { skipped: 'no articles in window' };
      } else {
        const r = await sendDigestToAll(digest);
        out.newsletter = { articleCount: digest.articleCount, sent: r.sent, recipients: r.recipients };
      }
    } catch (e) {
      out.newsletter = { error: (e as Error).message };
    }
  } else {
    out.newsletter = { skipped: 'not a Mon/Wed/Fri send day' };
  }

  // 2. Site-monitor (was its own Vercel cron; folded in here). Fire the
  //    existing endpoint internally so we don't duplicate its logic.
  try {
    const m = await fetch(`${SITE}/api/admin/monitor?token=${expected}`, {
      signal: AbortSignal.timeout(20_000),
    });
    out.monitor = { status: m.status };
  } catch (e) {
    out.monitor = { error: (e as Error).message };
  }

  // 2b. Internal-Linker — the single biggest on-page SEO lever and it had
  //     NO schedule (idle, never run; 180/300 recent articles had zero
  //     internal links → wasted crawl depth + PageRank). Folded into the
  //     daily fan-out: each run enriches the next ~30 link-less articles,
  //     so the backlog drains ~30/day and new articles get linked within
  //     a day of publishing. Fire-and-confirm (own 60s budget).
  try {
    await fetch(`${SITE}/api/internal-link?token=${expected}&sinceDays=30&limit=30`, {
      signal: AbortSignal.timeout(15_000),
    });
    out.internalLinker = { triggered: true };
  } catch {
    out.internalLinker = { triggered: true, note: 'fired (running independently)' };
  }

  // 3. Comparison longform — ONE per day. The 48-item queue is all
  //    genuinely-different products (Wirecutter-style; one solid buying
  //    guide a day is normal editorial volume, not scaled-content abuse).
  //    TRIGGERED as a separate /api/comparison invocation (not inline):
  //    it needs its own ~50s budget and Vercel Hobby hard-caps every
  //    function at 60s, so running it inside this fan-out would risk a
  //    timeout that also kills the newsletter. We fire the request and
  //    only wait a few seconds to confirm the function spun up — it then
  //    runs to completion independently. The agent dedups its queue and
  //    self-stops once every matchup is covered.
  try {
    await fetch(`${SITE}/api/comparison?token=${expected}`, {
      signal: AbortSignal.timeout(5_000),
    });
    out.comparison = { triggered: true };
  } catch {
    out.comparison = { triggered: true, note: 'fired (running independently)' };
  }

  // 3b. Quality-Upgrade — rewrites the next batch of thin pre-fix articles
  //     (avg 364w) into substantial 900-1300w pieces. The AdSense-readiness
  //     lever: drains the thin backlog ~4/day so the site's quality average
  //     climbs toward something a reviewer + Google's HCU reward. Own 60s
  //     budget, fire-and-confirm.
  try {
    await fetch(`${SITE}/api/quality-upgrade?token=${expected}`, {
      signal: AbortSignal.timeout(15_000),
    });
    out.qualityUpgrade = { triggered: true };
  } catch {
    out.qualityUpgrade = { triggered: true, note: 'fired (running independently)' };
  }

  // 4. GSC-Monitor — now that the service-account auth works, run it daily
  //    so it surfaces SEO opportunities (page-2 articles to push, high-
  //    impression/low-CTR queries) the moment Search Console accumulates
  //    enough query data. No-op (rowsAnalyzed:0) on a young site; self-
  //    activates as impressions grow. Fire-and-confirm, own budget.
  try {
    await fetch(`${SITE}/api/gsc-monitor?token=${expected}`, {
      signal: AbortSignal.timeout(15_000),
    });
    out.gscMonitor = { triggered: true };
  } catch {
    out.gscMonitor = { triggered: true, note: 'fired (running independently)' };
  }

  // 5. Watchdog + auditors that had NO schedule (Vercel Hobby caps at 2
  //    crons, cron-job.org was never set up, so Sentinel/Quality-Auditor/
  //    SEO-Auditor reported "never run" — the watchdog wasn't watching).
  //    Fold them into the daily fan-out: each is fire-and-confirm with its
  //    own function budget. Daily (not 5-min) is fine for catching
  //    regressions on a site this size — better than never running.
  for (const [key, path] of [
    ['sentinel', '/api/sentinel'],
    ['qualityAuditor', '/api/quality-audit'],
    ['seoAuditor', '/api/seo-audit'],
    ['titleBooster', '/api/title-boost'],
    ['trendReactor', '/api/trend-react'],
    ['socialRetry', '/api/social-retry'],
  ] as const) {
    try {
      await fetch(`${SITE}${path}?token=${expected}`, { signal: AbortSignal.timeout(8_000) });
      out[key] = { triggered: true };
    } catch {
      out[key] = { triggered: true, note: 'fired (running independently)' };
    }
  }

  await tg(
    `Daily-ops: newsletter=${JSON.stringify(out.newsletter)} monitor=${JSON.stringify(out.monitor)} comparison=${JSON.stringify(out.comparison)} gsc=${JSON.stringify(out.gscMonitor)} sentinel=${JSON.stringify(out.sentinel)}`,
    { silent: true },
  ).catch(() => null);

  return NextResponse.json({ ok: true, ...out });
}
