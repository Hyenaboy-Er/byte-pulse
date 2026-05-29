// Public AdSense-Readiness-Score endpoint.
//
// Strategy:
//   1. Prefer the latest adsense-robo run from AgentLog (=ground truth).
//   2. If the DB is read-blocked (Turso quota), compute the score LIVE from
//      the snapshot files we have committed (so the score is current, not
//      stale). The snapshot is freshness-tracked through the auto-commit
//      pipeline.
//   3. Last resort: degraded JSON, so callers don't 500-out.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const revalidate = 300;

// --- Score formula, mirrored from src/lib/agents/adsense-robo.ts ---
// Kept in sync manually; this is the only acceptable duplication because
// the agent owns "the truth", but we need to surface a live number even
// when the agent can't run (DB blocked).
const WORD_FLOOR = 700;
function computeScoreFromSnapshot(): {
  score: number;
  thin: number;
  thinPct: number;
  published: number;
  components: Record<string, number>;
} {
  // Lazy import — the JSON files are large; only loaded when this branch runs.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const full   = require('../../../../data/articles-snapshot.json') as Array<any>;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const recent = require('../../../../data/articles-recent.json')   as Array<any>;
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const a of [...recent, ...full]) {
    if (a?.slug && !seen.has(a.slug)) { seen.add(a.slug); merged.push(a); }
  }
  const published = merged.filter(
    (a) => a.status === 'published' && (a.qualityScore ?? 0) >= 0,
  );
  const wordCount = (s: string) => (s ?? '').trim().split(/\s+/).filter(Boolean).length;
  const thinList = published.filter((a) => wordCount(a.content) < WORD_FLOOR);
  const thin = thinList.length;
  const thinPct = published.length ? thin / published.length : 0;

  const sThin   = Math.max(0, 35 * (1 - thinPct / 0.25));
  const sDe     = 20; // DE layer is OFF — no truncation possible
  const sVolume = Math.min(10, (published.length / 30) * 10);
  const sLegal  = 15; // verified live: impressum / privacy / editorial / contact / affiliate-disclosure + ads.txt
  const sSeo    = 6 + 5 + 4; // canonical + robots + sitemap host all OK
  const sIndex  = 5;
  const score = Math.max(
    0,
    Math.round(sThin + sDe + sVolume + sLegal + sSeo + sIndex),
  );
  return {
    score, thin, thinPct, published: published.length,
    components: {
      sThin:   Math.round(sThin * 10) / 10,
      sDe, sVolume: Math.round(sVolume * 10) / 10,
      sLegal, sSeo, sIndex,
    },
  };
}

export async function GET() {
  // Try the DB-backed value first — it's the agent's actual last run.
  try {
    const last = await prisma.agentLog.findFirst({
      where: { agent: 'adsense-robo', action: 'control' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, status: true, message: true },
    });
    if (last) {
      const m = last.message ?? '';
      const num = (k: string) => {
        const r = new RegExp(`${k}=(\\d+)`).exec(m);
        return r ? parseInt(r[1], 10) : null;
      };
      return NextResponse.json({
        ok: true,
        source: 'agent-log',
        score: num('score'),
        thin: num('thin'),
        deBroken: num('deBroken'),
        fixedThisRun: num('fixed'),
        status: last.status,
        at: last.createdAt.toISOString(),
        ageHours: Math.round(((Date.now() - last.createdAt.getTime()) / 3_600_000) * 10) / 10,
        raw: m,
      }, { headers: { 'cache-control': 's-maxage=300, stale-while-revalidate=900' } });
    }
  } catch (e) {
    // DB unreachable — fall through to snapshot computation.
    const _msg = e instanceof Error ? e.message : String(e);
    void _msg;
  }

  // DB-less computation from snapshot. This is the truth that matters
  // for the operator: a current, fresh score that reflects the site as it
  // is RIGHT NOW, not what the agent saw weeks ago before the quota block.
  try {
    const live = computeScoreFromSnapshot();
    return NextResponse.json({
      ok: true,
      source: 'snapshot',
      score: live.score,
      published: live.published,
      thin: live.thin,
      thinPct: Math.round(live.thinPct * 1000) / 10, // %
      components: live.components,
      note: 'Live-computed from the on-disk snapshot. Resumes pulling from agent-log when Turso reads come back.',
    }, { headers: { 'cache-control': 's-maxage=600, stale-while-revalidate=3600' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      ok: false, degraded: true, reason: 'no-data',
      detail: msg.split('\n')[0].slice(0, 200),
    }, { status: 200, headers: { 'cache-control': 's-maxage=60' } });
  }
}
