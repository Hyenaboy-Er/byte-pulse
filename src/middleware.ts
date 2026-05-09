import { NextResponse, type NextRequest } from 'next/server';

// Pass the request pathname to server components via a request header (not response).
// Root layout reads `x-pathname` to set <html lang="de"> on /de routes.
export function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
