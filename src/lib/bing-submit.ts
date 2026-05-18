// Bing Webmaster URL Submission API — the RELIABLE replacement for the
// open IndexNow endpoint.
//
// Why this exists: api.indexnow.org rejects every ping for this site with
// HTTP 422 ("URLs not related to your site verified through the
// keylocation parameter") even with a correct www keyLocation. Meanwhile
// Bing URL Inspection showed the top article as "not known to Bing" —
// the open-IndexNow path simply never delivered.
//
// The Bing Webmaster API (apikey-authenticated, tied to the verified
// site in Bing Webmaster Tools) DOES work: GetUrlSubmissionQuota +
// SubmitUrlbatch return HTTP 200. This is the supported, owner-scoped
// channel. Key lives in BING_WEBMASTER_API_KEY (Vercel env, gitignored
// .secrets-local.txt locally). Free tier: ~100 URLs/day, ~1400/month.
//
// Non-fatal by design: any failure just logs and returns — the daily
// sitemap crawl still picks URLs up, this only accelerates discovery.

import { SITE } from './site';

const API_KEY = process.env.BING_WEBMASTER_API_KEY?.trim();
const BASE = 'https://ssl.bing.com/webmaster/api.svc/json';

export type BingSubmitResult = {
  ok: boolean;
  submitted: number;
  status: number;
  skipped?: string;
};

// How many URLs Bing will still accept today (DailyQuota). Lets callers
// stay within the free-tier limit instead of blindly POSTing and 400ing.
export async function bingDailyQuota(): Promise<number | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(
      `${BASE}/GetUrlSubmissionQuota?apikey=${API_KEY}&siteUrl=${encodeURIComponent(SITE.url)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { d?: { DailyQuota?: number } };
    return j?.d?.DailyQuota ?? null;
  } catch {
    return null;
  }
}

// Submit a batch of fully-qualified URLs (same host as SITE.url) to Bing
// for indexation. Caps at the remaining daily quota automatically.
export async function submitUrlsToBing(urls: string[]): Promise<BingSubmitResult> {
  if (!urls.length) return { ok: true, submitted: 0, status: 0 };
  if (!API_KEY) return { ok: false, submitted: 0, status: 0, skipped: 'no BING_WEBMASTER_API_KEY' };

  // Only same-host URLs — Bing rejects the whole batch otherwise.
  const host = new URL(SITE.url).host;
  let list = Array.from(new Set(urls)).filter((u) => {
    try { return new URL(u).host === host; } catch { return false; }
  });
  if (!list.length) return { ok: true, submitted: 0, status: 0, skipped: 'no same-host urls' };

  const quota = await bingDailyQuota();
  if (quota !== null && quota <= 0) {
    return { ok: true, submitted: 0, status: 0, skipped: 'daily quota exhausted' };
  }
  if (quota !== null && list.length > quota) list = list.slice(0, quota);

  try {
    const res = await fetch(
      `${BASE}/SubmitUrlbatch?apikey=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ siteUrl: SITE.url, urlList: list }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    const ok = res.status >= 200 && res.status < 300;
    if (!ok) console.warn('[bing-submit] non-2xx:', res.status, (await res.text()).slice(0, 200));
    return { ok, submitted: ok ? list.length : 0, status: res.status };
  } catch (e) {
    console.warn('[bing-submit] failed:', (e as Error).message);
    return { ok: false, submitted: 0, status: 0 };
  }
}
