import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Newsletter is currently disabled. The endpoint stays alive so old clients don't error;
// we just respond with a clear message and 503.
export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'Newsletter not yet active. Coming soon.' },
    { status: 503 }
  );
}
