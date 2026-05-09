import { NextResponse, type NextRequest } from 'next/server';

// Pass the request pathname to server components via a custom header.
// Root layout reads `x-pathname` to set <html lang="de"> on /de routes.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('x-pathname', req.nextUrl.pathname);
  return res;
}

export const config = {
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
