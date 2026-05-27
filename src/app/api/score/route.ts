// Public read-only AdSense-Readiness-Score endpoint. Surfaces the latest
// adsense-robo run from AgentLog so the operator (and Claude in a chat
// session) can ask "where are we" without admin auth or Telegram.
//
// Resilient: if the DB is read-blocked (Turso quota), return a structured
// 200 explaining the situation instead of a 500. Callers that interpret
// any 500 as a hard fault (video-generator did exactly that) keep working.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// 5-min revalidate cuts DB pressure to ~12 reads/hr instead of one per request.
export const revalidate = 300;

export async function GET() {
  try {
    const last = await prisma.agentLog.findFirst({
      where: { agent: 'adsense-robo', action: 'control' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, status: true, message: true },
    });
    if (!last) {
      return NextResponse.json({ ok: false, error: 'no adsense-robo run yet' });
    }
    const m = last.message ?? '';
    const num = (k: string) => {
      const r = new RegExp(`${k}=(\\d+)`).exec(m);
      return r ? parseInt(r[1], 10) : null;
    };
    return NextResponse.json({
      ok: true,
      score: num('score'),
      thin: num('thin'),
      deBroken: num('deBroken'),
      fixedThisRun: num('fixed'),
      status: last.status,
      at: last.createdAt.toISOString(),
      ageHours: Math.round(((Date.now() - last.createdAt.getTime()) / 3_600_000) * 10) / 10,
      raw: m,
    }, { headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=900' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const blocked = /BLOCKED|reads are blocked|forbidden/i.test(msg);
    return NextResponse.json({
      ok: false,
      degraded: true,
      reason: blocked ? 'db-read-blocked' : 'db-error',
      detail: msg.split('\n')[0].slice(0, 200),
    }, { status: 200, headers: { 'cache-control': 's-maxage=60' } });
  }
}
