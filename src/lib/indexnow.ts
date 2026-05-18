// IndexNow — submit fresh URLs to Bing/Yandex (+ Seznam/Naver) in near-real-time.
// Replaces the slow "wait for crawler to come back" cycle. Google doesn't use
// IndexNow yet but Bing does, and Bing-indexed pages also show up in DuckDuckGo,
// Ecosia and a chunk of European search market.
//
// Spec: https://www.indexnow.org/documentation
// We pre-generate a per-site verification key, expose it at /<key>.txt, and
// ping the IndexNow endpoint with the new URLs whenever the writer publishes.
//
// Failure is non-fatal — IndexNow is a "fire-and-forget" optimization.

import { SITE } from './site';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY ?? 'a3f8b2c1d9e4f5g6h7i8j9k0l1m2n3o4';
const SITE_URL = SITE.url;

export function indexNowKey(): string {
  return INDEXNOW_KEY;
}

export async function pingIndexNow(urls: string[]): Promise<{ ok: boolean; status: number; submitted: number }> {
  if (!urls.length) return { ok: true, status: 0, submitted: 0 };
  const host = new URL(SITE_URL).host;
  const body = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/indexnow/${INDEXNOW_KEY}`,
    urlList: urls.slice(0, 10_000), // spec allows up to 10k per request
  };
  try {
    // Bing's endpoint also fans out to Yandex / Seznam / Naver per IndexNow spec
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, submitted: urls.length };
  } catch {
    return { ok: false, status: 0, submitted: 0 };
  }
}
