import { NextResponse, type NextRequest } from 'next/server';

// 1. Trailing-slash stripping: keep exactly one URL shape per page.
// 2. Pass request pathname to server components via x-pathname header so
//    RootLayout can set <html lang="de"> on /de routes.
//
// HOST NORMALIZATION (www vs non-www) IS DELIBERATELY HANDLED BY VERCEL'S
// EDGE LAYER, NOT THIS MIDDLEWARE. Vercel's project settings declare
// byte-pulse.net (non-www) as primary and 308-redirect www.byte-pulse.net to
// it. If we ALSO redirect inside middleware (e.g. non-www → www), the two
// systems fight each other and produce an infinite redirect loop. Don't
// add host logic here unless you've first updated Vercel domain settings.

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

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
