import { NextResponse } from 'next/server';
import { getCurrentTrends } from '@/lib/agents/keyword-research';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    const snapshot = await getCurrentTrends();
    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
