// Self-hosted OG image proxy: keeps social embeds working even if the source
// removes its image, and avoids the Open Graph domain-mismatch problem.
// Validates URL is on http(s), strips redirects, caches at the edge.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB cap

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = url.searchParams.get('url');
  if (!target) return new NextResponse('missing url', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse('invalid url', { status: 400 });
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return new NextResponse('protocol not allowed', { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(8_000),
      headers: { 'User-Agent': 'Byte-Pulse/1.0 (+https://byte-pulse.net)' },
    });
    if (!upstream.ok) return new NextResponse('upstream error', { status: 502 });

    const ct = upstream.headers.get('content-type') ?? 'image/jpeg';
    if (!ct.startsWith('image/')) return new NextResponse('not an image', { status: 415 });

    const len = Number(upstream.headers.get('content-length') ?? 0);
    if (len && len > MAX_BYTES) return new NextResponse('too large', { status: 413 });

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return new NextResponse('too large', { status: 413 });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': ct,
        // Cache 1 day at the edge, 7 days in browsers; SWR for 30 days.
        'Cache-Control': 'public, max-age=604800, s-maxage=86400, stale-while-revalidate=2592000',
      },
    });
  } catch {
    return new NextResponse('fetch failed', { status: 502 });
  }
}
