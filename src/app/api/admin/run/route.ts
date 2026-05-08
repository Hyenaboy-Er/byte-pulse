import { NextResponse } from 'next/server';
import { runOnce } from '@/lib/agents/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const report = await runOnce();
  return NextResponse.json({ ok: !report.error, report });
}
