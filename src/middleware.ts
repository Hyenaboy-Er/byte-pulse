import { NextResponse, type NextRequest } from 'next/server';

// Middleware does ONE thing: trailing-slash stripping. Anything else (host
// normalization, lang detection, cache headers) is handled elsewhere.
//
// HOST NORMALIZATION (www vs non-www) is handled by VERCEL'S edge layer, not
// here. Vercel declares byte-pulse.net (non-www) as primary and 308-redirects
// www → it. Adding host logic here would fight Vercel and produce loops.
//
// PATHNAME-INJECTING HEADERS (e.g. x-pathname for the RootLayout) were
// REMOVED on 2026-05-14: even though we never read that header anymore,
// calling `NextResponse.next({ request: { headers } })` was enough to mark
// every matched route as dynamic in Next 15, which kicked Cache-Control over
// to `private, no-store` and disabled the CDN edge cache. Article pages now
// stream from cache as intended.

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // DE layer fully retired: permanently redirect any indexed /de/* URL to the
  // EN canonical so Google/Bing flow legacy DE pages to the live equivalent
  // instead of dead 404s. Runs BEFORE the trailing-slash strip so the strip
  // applies to the redirected EN path, not the DE source.
  if (url.pathname === '/de' || url.pathname.startsWith('/de/')) {
    url.pathname = url.pathname === '/de' ? '/' : url.pathname.replace(/^\/de/, '');
    return NextResponse.redirect(url, 308);
  }

  // Trailing-slash stripping (but never strip the root "/")
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
