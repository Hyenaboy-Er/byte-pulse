// GSC-Monitor Agent — tracks Google Search Console impressions per article
// via the public Search Console API (free, OAuth) and identifies pages with
// high impressions + low CTR. Those are the articles where a punchier title
// would 5-10x the click count overnight.
//
// Note: this agent only works once you've set up GSC API access:
// - Enabled Search Console API in Google Cloud Console
// - Created a service account, downloaded the JSON key
// - Added that service account email as a USER on the GSC property
// - Set GSC_SERVICE_ACCOUNT_KEY env var to the JSON key contents
//
// Until those steps are done, this agent is a no-op (logs 'gsc-not-configured').
// The TITLE_BOOSTER will run on whatever we have (recent published) instead.
//
// When configured, every run:
// 1. Fetches last-7-days data per page
// 2. Flags articles with > 10 impressions and CTR < 1% → priority queue
// 3. Logs the queue so title-booster can read it on its next run
// 4. Sends Telegram alert if any top opportunity is found

import { prisma } from '../db';
import { tg } from '../telegram';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';

type GSCRow = {
  keys: string[]; // [page-url]
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GSCMonitorReport = {
  status: 'ok' | 'gsc-not-configured';
  rowsAnalyzed: number;
  opportunities: { slug: string; impressions: number; ctr: number; position: number }[];
  queuedForBoost: number;
};

// Lightweight JWT signer for Google OAuth — implemented in plain Node.js
// crypto to avoid pulling in googleapis (which is huge). Service account
// flow only: no user-OAuth dance.
async function getGSCAccessToken(): Promise<string | null> {
  const raw = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  let key: { client_email: string; private_key: string; token_uri?: string };
  try { key = JSON.parse(raw); } catch { return null; }

  const { createSign } = await import('node:crypto');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: key.token_uri ?? 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const sig = signer.sign(key.private_key).toString('base64url');
  const jwt = `${header}.${claims}.${sig}`;

  const tokenRes = await fetch(key.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    signal: AbortSignal.timeout(8_000),
  });
  if (!tokenRes.ok) return null;
  const tok = (await tokenRes.json()) as { access_token?: string };
  return tok.access_token ?? null;
}

export async function runGSCMonitor(opts?: { minImpressions?: number; maxCtr?: number; days?: number }): Promise<GSCMonitorReport> {
  const minImpressions = opts?.minImpressions ?? 10;
  const maxCtr = opts?.maxCtr ?? 0.01; // < 1% CTR = clickable-title opportunity
  const days = opts?.days ?? 7;

  const accessToken = await getGSCAccessToken();
  if (!accessToken) {
    return { status: 'gsc-not-configured', rowsAnalyzed: 0, opportunities: [], queuedForBoost: 0 };
  }

  // Fetch per-page performance for the last N days
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 24 * 3600_000).toISOString().slice(0, 10);
  const propUrl = encodeURIComponent(SITE_URL.replace(/\/$/, '/'));
  let rows: GSCRow[] = [];
  try {
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${propUrl}/searchAnalytics/query`, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions: ['page'], rowLimit: 200 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      await prisma.agentLog.create({
        data: { agent: 'gsc-monitor', action: 'fetch', status: 'error', message: `${res.status} ${(await res.text()).slice(0, 120)}` },
      }).catch(() => null);
      return { status: 'ok', rowsAnalyzed: 0, opportunities: [], queuedForBoost: 0 };
    }
    const data = (await res.json()) as { rows?: GSCRow[] };
    rows = data.rows ?? [];
  } catch (err) {
    await prisma.agentLog.create({
      data: { agent: 'gsc-monitor', action: 'fetch', status: 'error', message: (err as Error).message },
    }).catch(() => null);
    return { status: 'ok', rowsAnalyzed: 0, opportunities: [], queuedForBoost: 0 };
  }

  // Identify opportunity rows: high impressions, low CTR
  const opportunities: GSCMonitorReport['opportunities'] = [];
  for (const r of rows) {
    if (r.impressions < minImpressions) continue;
    if (r.ctr >= maxCtr && r.position <= 10) continue; // already clicking fine
    const url = r.keys[0];
    const m = url.match(/\/(?:de\/)?article\/([^/?#]+)/);
    if (!m) continue;
    opportunities.push({ slug: m[1], impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position });
  }

  // Queue them for title-booster on next run. We do this by writing a special
  // agentLog row with action='queue' that the title-booster picks up.
  let queued = 0;
  for (const op of opportunities.slice(0, 10)) {
    await prisma.agentLog.create({
      data: {
        agent: 'gsc-monitor',
        action: 'queue',
        status: 'success',
        message: op.slug,
        meta: JSON.stringify({ impressions: op.impressions, ctr: op.ctr, position: op.position }),
      },
    }).catch(() => null);
    queued++;
  }

  if (opportunities.length > 0) {
    const top = opportunities.slice(0, 5);
    await tg(
      `📈 GSC-Monitor · ${opportunities.length} Artikel mit High-Impression-Low-CTR\n\n` +
      top.map((o) => `  ${o.impressions} Impr · CTR ${(o.ctr * 100).toFixed(1)}% · Pos ${o.position.toFixed(1)} · ${o.slug}`).join('\n') +
      `\n\nTitle-Booster wird diese im nächsten Lauf priorisieren.`
    );
  }

  return { status: 'ok', rowsAnalyzed: rows.length, opportunities, queuedForBoost: queued };
}
