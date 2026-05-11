import { NextResponse, type NextRequest } from 'next/server';

// 1. Canonical-host enforcement: collapse non-www to www (or whichever
//    NEXT_PUBLIC_SITE_URL declares). Google indexes both as separate URLs
//    unless we 301 to one of them.
// 2. Trailing-slash stripping: keep exactly one URL shape per page.
// 3. Pass request pathname to server components via x-pathname header so
//    RootLayout can set <html lang="de"> on /de routes.
//
// All redirects use 308 (permanent) so search engines update their index.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? '';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') ?? '';
  let canonicalHost: string | null = null;
  try {
    if (SITE_URL) canonicalHost = new URL(SITE_URL).host;
  } catch {}

  // Host normalization (skip on localhost and Vercel preview deployments)
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const isPreview = host.endsWith('.vercel.app');
  if (canonicalHost && !isLocal && !isPreview && host !== canonicalHost) {
    url.host = canonicalHost;
    return NextResponse.redirect(url, 308);
  }

  // Trailing-slash stripping (but never strip the root "/")
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
    return NextResponse.redirect(url, 308);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
