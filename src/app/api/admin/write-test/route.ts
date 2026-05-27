// Temp endpoint — checks whether the production Turso DB still accepts
// writes while the read quota is blocked. We try a tiny AgentLog insert
// (additive, idempotent in spirit), then immediately read it back. If the
// write succeeds + the read fails: writes-only mode is viable for the
// writer. If both fail: only the Quota-Reset unblocks the pipeline.
//
// Protected by CRON_SECRET. Will be removed after the diagnosis.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tok = url.searchParams.get('token');
  if (tok !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const out: any = { writes: null, reads: null, write_error: null, read_error: null };

  // 1. Try a tiny write
  try {
    const row = await prisma.agentLog.create({
      data: {
        agent: 'write-test',
        action: 'probe',
        status: 'ok',
        message: 'turso-quota-probe ' + new Date().toISOString(),
      },
    });
    out.writes = { ok: true, id: row.id };
  } catch (e: any) {
    out.writes = { ok: false };
    out.write_error = (e?.message ?? String(e)).split('\n')[0].slice(0, 240);
  }

  // 2. Try a tiny read
  try {
    const c = await prisma.agentLog.count();
    out.reads = { ok: true, count: c };
  } catch (e: any) {
    out.reads = { ok: false };
    out.read_error = (e?.message ?? String(e)).split('\n')[0].slice(0, 240);
  }

  return NextResponse.json(out);
}
