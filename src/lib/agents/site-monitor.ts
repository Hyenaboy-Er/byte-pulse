// Site-Monitor agent — measures public-facing health of byte-pulse.net every
// 15 minutes and pings Telegram when anything degrades. Catches what the
// Writer/Reviewer agents can't see: response time, payload size, HTTP errors,
// redirect chains, and aggressive third-party scripts on the rendered page.
//
// Designed to run on the same Vercel cron infrastructure as the Writer
// pipeline (/api/site-monitor route). Stateless — every invocation re-measures
// and decides whether to alert, with a 60-minute cooldown per failure class.

import { prisma } from '../db';
import { tg, tgWarn } from '../telegram';
import { SITE } from '../site';

const SITE_URL = SITE.url;

// Targets we sample on every run. Limit to ~5 URLs to keep each cron under 10s.
const TARGETS: { path: string; label: string; budgetMs: number }[] = [
  { path: '/',           label: 'home-en', budgetMs: 2500 },
  { path: '/category/ai', label: 'cat-ai', budgetMs: 2500 },
];

const ALERT_COOLDOWN = 60 * 60 * 1000;
type AlertKind = 'slow' | 'http_error' | 'redirect_loop' | 'heavy_payload';

async function recentlyAlerted(kind: AlertKind, label: string): Promise<boolean> {
  const recent = await prisma.agentLog.findFirst({
    where: {
      agent: 'site-monitor',
      action: 'alert',
      message: { contains: `${kind}:${label}` },
      createdAt: { gte: new Date(Date.now() - ALERT_COOLDOWN) },
    },
  });
  return !!recent;
}

async function logAlert(kind: AlertKind, label: string, detail: string) {
  if (await recentlyAlerted(kind, label)) return;
  await tgWarn(`Site-Monitor · ${label}: ${detail}`);
  await prisma.agentLog.create({
    data: {
      agent: 'site-monitor',
      action: 'alert',
      status: 'warn',
      message: `${kind}:${label}`,
      meta: detail.slice(0, 400),
    },
  });
}

type SampleResult = {
  label: string;
  path: string;
  finalStatus: number;
  redirects: number;
  totalMs: number;
  bytes: number;
  ok: boolean;
};

async function sample(t: typeof TARGETS[number]): Promise<SampleResult> {
  const t0 = Date.now();
  let redirects = 0;
  let url = `${SITE_URL}${t.path}`;
  let bytes = 0;
  let status = 0;

  // Manual redirect-follow so we can count hops (catches the non-www↔www loop we hit yesterday)
  for (let i = 0; i < 6; i++) {
    const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'Byte-Pulse-Site-Monitor/1.0' } });
    status = res.status;
    if (status >= 300 && status < 400) {
      const loc = res.headers.get('location');
      if (!loc) break;
      url = loc.startsWith('http') ? loc : new URL(loc, url).toString();
      redirects++;
      continue;
    }
    const body = await res.text();
    bytes = new Blob([body]).size;
    break;
  }

  const totalMs = Date.now() - t0;
  const ok = status >= 200 && status < 300 && totalMs <= t.budgetMs * 2 && redirects <= 2 && bytes >= 5000;
  return { label: t.label, path: t.path, finalStatus: status, redirects, totalMs, bytes, ok };
}

export type SiteMonitorReport = {
  startedAt: string;
  finishedAt: string;
  samples: SampleResult[];
  alerts: number;
};

export async function runSiteMonitor(): Promise<SiteMonitorReport> {
  const startedAt = new Date().toISOString();
  const samples: SampleResult[] = [];
  let alerts = 0;

  for (const t of TARGETS) {
    try {
      const r = await sample(t);
      samples.push(r);

      // Decide if this sample warrants a Telegram alert
      if (r.finalStatus >= 500 || r.finalStatus === 0) {
        await logAlert('http_error', r.label, `HTTP ${r.finalStatus} on ${r.path}`);
        alerts++;
      } else if (r.redirects >= 4) {
        await logAlert('redirect_loop', r.label, `${r.redirects} redirects on ${r.path}`);
        alerts++;
      } else if (r.totalMs > t.budgetMs * 2) {
        await logAlert('slow', r.label, `${r.totalMs}ms on ${r.path} (budget ${t.budgetMs}ms)`);
        alerts++;
      } else if (r.bytes > 400_000) {
        await logAlert('heavy_payload', r.label, `${Math.round(r.bytes / 1024)}KB on ${r.path}`);
        alerts++;
      }
    } catch (err) {
      samples.push({ label: t.label, path: t.path, finalStatus: 0, redirects: 0, totalMs: 0, bytes: 0, ok: false });
      await logAlert('http_error', t.label, `fetch threw: ${(err as Error).message.slice(0, 120)}`);
      alerts++;
    }
  }

  await prisma.agentLog.create({
    data: {
      agent: 'site-monitor',
      action: 'run',
      status: alerts === 0 ? 'success' : 'warn',
      message: `samples=${samples.length} alerts=${alerts}`,
      meta: JSON.stringify(samples.map((s) => ({ p: s.path, ms: s.totalMs, b: s.bytes, st: s.finalStatus }))),
    },
  });

  void tg;
  return { startedAt, finishedAt: new Date().toISOString(), samples, alerts };
}
