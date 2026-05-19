import { NextResponse } from 'next/server';
import { runOnce, type RunReport } from '@/lib/agents/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const batch = Math.max(1, Math.min(30, Number(url.searchParams.get('batch') ?? '1')));
  const expected = process.env.CRON_SECRET;

  // Vercel cron sends `Authorization: Bearer $CRON_SECRET` automatically; also accept ?token=
  if (expected && auth !== `Bearer ${expected}` && tokenFromQuery !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Time-bounded batch: stop ~50s in to leave headroom for the response.
  const deadline = Date.now() + 50_000;
  const reports: RunReport[] = [];
  let published = 0;
  for (let i = 0; i < batch && Date.now() < deadline; i++) {
    const r = await runOnce();
    reports.push(r);
    if (r.published) published++;
    if (r.error) break;
  }

  // SECOND daily backlog drain. The 08:00 fan-out already fires
  // quality-upgrade + translation-repair once/day; the auditor showed
  // that single pass can't keep up (53% thin, 123 broken DE). Fire them
  // again here at 07:00 (fire-and-forget, own 60s budget) → roughly
  // doubles the daily drain rate without touching the writer's budget.
  const base = `${url.protocol}//${url.host}`;
  await Promise.allSettled([
    fetch(`${base}/api/quality-upgrade?token=${expected}`, { signal: AbortSignal.timeout(3000) }),
    fetch(`${base}/api/translate-repair?token=${expected}&max=8`, { signal: AbortSignal.timeout(3000) }),
  ]);

  return NextResponse.json({
    ok: !reports.some((r) => r.error),
    attempted: reports.length,
    published,
    last: reports[reports.length - 1],
    drain: 'quality-upgrade + translate-repair fired',
  });
}
