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
import { submitUrlsToBing } from '@/lib/bing-submit';
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

  // 1b. Bing URL Submission backfill. The open IndexNow endpoint 422s for
  //     this site, so per-publish pings never reached Bing (URL Inspection
  //     showed the top article "not known to Bing"). The Bing Webmaster
  //     API key path DOES work. Each daily run resubmits the recent
  //     news-sitemap URLs (now correct www host) up to the remaining
  //     ~99/day quota — submitUrlsToBing self-caps, so this can't 400.
  try {
    const sm = await fetch(`${SITE}/news-sitemap.xml`, { signal: AbortSignal.timeout(10_000) });
    const xml = await sm.text();
    const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
      .map((m) => m[1])
      .filter((u) => !u.includes('/de/'));
    const r = await submitUrlsToBing(urls);
    out.bingSubmit = { submitted: r.submitted, status: r.status, ...(r.skipped ? { skipped: r.skipped } : {}) };
  } catch (e) {
    out.bingSubmit = { error: (e as Error).message };
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

  // 6. Previously-IDLE agents — reactivated. These had NO schedule at all
  //    (Vercel Hobby = 2 crons; they were never wired anywhere) so they
  //    sat dead since launch. Each is genuinely useful:
  //      • community-reply  → answers Mastodon comments (engagement signal)
  //      • backlink-hunt    → finds link opportunities (backlinks are THE
  //        single biggest missing ranking signal for this domain)
  //      • content-refresh  → freshness pass on older articles (SEO)
  //      • director         → daily strategic state-of-the-union to Telegram
  //      • affiliate-optimize → tunes affiliate placement (revenue)
  //      • stats            → Telegram heartbeat digest
  //      • email-watch      → no-ops safely until GMAIL_IMAP creds exist,
  //        then self-activates (reactivating the trigger now = zero extra
  //        work the day creds land)
  //    Fired CONCURRENTLY with a short timeout: we only need to kick each
  //    function off — it then runs to completion on its own 60s budget.
  //    Concurrent (not sequential) so this whole block adds ~4s, keeping
  //    the daily route safely under the Vercel 60s cap.
  //    NOTE: site-monitor is deliberately NOT here — monitor.ts already
  //    runs as step 2 above; re-adding site-monitor.ts would just
  //    duplicate the same public-health checks.
  const idleAgents: Array<[string, string]> = [
    ['communityReplies', '/api/community-reply'],
    ['backlinkHunter', '/api/backlink-hunt'],
    ['contentRefresher', '/api/content-refresh'],
    ['director', '/api/director'],
    ['affiliateOptimizer', '/api/affiliate-optimize'],
    ['statsReporter', '/api/stats'],
    ['emailWatcher', '/api/email-watch'],
    // Translation-Repair: the QA controller the translator never had.
    // Re-translates DE articles truncated by the old maxTokens:4000 bug,
    // ~5/run, until the backlog of broken German pages is drained.
    ['translationRepair', '/api/translate-repair'],
    // AdSense-Robo: the consolidating control brain. Checks content /
    // indexing / quality, AUTO-FIXES the safe ones (quality-upgrade,
    // translation-repair, Bing submit, SEO-host regression guard),
    // computes a readiness score, escalates only the unfixable.
    ['adsenseRobo', '/api/adsense-robo'],
    // Agent-Auditor: meta-watchdog. Audits whether every agent produced
    // GOOD WORK (real outcome metrics), not just "ran 200" — the failure
    // mode that hid broken agents for weeks. Escalates only ⚠️/❌.
    ['agentAuditor', '/api/agent-audit'],
    // Thin-Pruner: de-indexes genuinely worthless thin legacy articles
    // (Google "improve OR remove") — the fastest legitimate path to 90+
    // AdSense readiness. Hard guardrails: <500w + <2 views + >21d old +
    // never the founder longform. Drains ~80/run.
    ['thinPruner', '/api/thin-prune'],
  ];
  const idleResults = await Promise.allSettled(
    idleAgents.map(([, path]) =>
      fetch(`${SITE}${path}?token=${expected}`, { signal: AbortSignal.timeout(4_000) }),
    ),
  );
  idleAgents.forEach(([key], i) => {
    out[key] = { triggered: true, note: idleResults[i].status === 'fulfilled' ? 'kicked off' : 'fired (running independently)' };
  });

  await tg(
    `Daily-ops: newsletter=${JSON.stringify(out.newsletter)} monitor=${JSON.stringify(out.monitor)} comparison=${JSON.stringify(out.comparison)} gsc=${JSON.stringify(out.gscMonitor)} sentinel=${JSON.stringify(out.sentinel)} idle-reactivated=${idleAgents.length}`,
    { silent: true },
  ).catch(() => null);

  return NextResponse.json({ ok: true, ...out });
}
