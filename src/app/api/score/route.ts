// Public read-only AdSense-Readiness-Score endpoint. Surfaces the latest
// adsense-robo run from AgentLog so the operator (and Claude in a chat
// session) can ask "where are we" without admin auth or Telegram. The
// score itself is not sensitive — it's a self-grade of the public site.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
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
  }, { headers: { 'cache-control': 's-maxage=60, stale-while-revalidate=600' } });
}
