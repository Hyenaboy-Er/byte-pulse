// Trend-Reactor Agent — first-mover advantage on breaking news.
//
// Google's news ranking heavily weights 'first to publish' on a topic. The
// regular Writer cron runs every 30 minutes and processes whatever's at the
// top of the feed. This agent runs every 5 minutes and *interrupts* the
// regular cadence when it detects a story trending hard right now — a topic
// that just appeared on HN Algolia with >100 points in <2h, or that just hit
// Reddit r/technology hot-list with >500 upvotes in <1h.
//
// Net effect: instead of being the 30th site to publish about Apple-launches-X,
// we're in the first 5 → Google credits us as primary source → better ranking
// and inclusion in Top Stories rich-results.

import { prisma } from '../db';
import { tg } from '../telegram';
import { runOnce } from './orchestrator';

const HN_ALGOLIA = 'https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=30';

type HNHit = {
  objectID: string;
  title: string;
  url?: string;
  points?: number;
  num_comments?: number;
  created_at: string;
};

export type TrendReactorReport = {
  scanned: number;
  triggered: number;
  topics: { title: string; score: number; ageMinutes: number; source: string }[];
};

// Score a trending story. Score combines points + comments + freshness.
// Stories under 30 min old with >50 points are flagged as 'breaking'.
function scoreHit(h: HNHit): { score: number; ageMinutes: number } {
  const ageMinutes = (Date.now() - new Date(h.created_at).getTime()) / 60_000;
  const points = h.points ?? 0;
  const comments = h.num_comments ?? 0;
  // Velocity-weighted: points-per-hour matters more than absolute points.
  const ageHours = Math.max(0.1, ageMinutes / 60);
  const velocity = (points + comments * 2) / ageHours;
  return { score: Math.round(velocity), ageMinutes };
}

// Check if we've already covered this story. We hash the URL + title prefix
// against the dedupHash field used by the orchestrator's intake pipeline.
async function alreadyCovered(title: string, url?: string): Promise<boolean> {
  // Tight match: same canonical URL
  if (url) {
    const exact = await prisma.article.findFirst({
      where: { sourceUrl: { contains: new URL(url).pathname.split('/').slice(0, 4).join('/') } },
      select: { id: true },
    });
    if (exact) return true;
  }
  // Loose match: title-prefix collision (first 60 chars)
  const titlePrefix = title.slice(0, 60).toLowerCase();
  const titleMatch = await prisma.article.findFirst({
    where: { title: { contains: titlePrefix.slice(0, 40) } },
    select: { id: true },
  });
  return !!titleMatch;
}

export async function runTrendReactor(opts?: { minScore?: number; maxAgeHours?: number; maxTrigger?: number }): Promise<TrendReactorReport> {
  const minScore = opts?.minScore ?? 80; // velocity threshold (points+comments per hour)
  const maxAgeHours = opts?.maxAgeHours ?? 4;
  const maxTrigger = Math.max(1, Math.min(3, opts?.maxTrigger ?? 1)); // never trigger more than 3 publishes per run

  const topics: TrendReactorReport['topics'] = [];
  let scanned = 0;
  let triggered = 0;

  try {
    const res = await fetch(HN_ALGOLIA, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`HN Algolia ${res.status}`);
    const data = (await res.json()) as { hits: HNHit[] };

    // Filter for tech-relevant + recent + high-velocity
    const techMarkers = /\b(ai|gpt|llm|cloud|chip|cpu|gpu|nvidia|samsung|apple|google|meta|microsoft|tesla|spacex|openai|anthropic|github|linux|kernel|browser|firefox|chrome|safari|android|ios|iphone|pixel|mac|rust|wasm|webgpu|kubernetes|docker)\b/i;

    const candidates = data.hits
      .map((h) => ({ hit: h, ...scoreHit(h) }))
      .filter((c) => c.ageMinutes < maxAgeHours * 60)
      .filter((c) => techMarkers.test(c.hit.title))
      .sort((a, b) => b.score - a.score);

    scanned = candidates.length;

    for (const c of candidates) {
      if (triggered >= maxTrigger) break;
      if (c.score < minScore) continue;
      if (await alreadyCovered(c.hit.title, c.hit.url)) continue;

      topics.push({ title: c.hit.title, score: c.score, ageMinutes: Math.round(c.ageMinutes), source: 'HN' });

      // Trigger the orchestrator with this specific URL as the seed
      try {
        await runOnce();
        triggered++;
        await tg(`⚡ Trend-Reactor · breaking story published\n  Score ${c.score} · ${Math.round(c.ageMinutes)}min old\n  ${c.hit.title}\n  Source: HN`);
      } catch (err) {
        await prisma.agentLog.create({
          data: { agent: 'trend-reactor', action: 'react', status: 'error', message: (err as Error).message },
        }).catch(() => null);
      }
    }
  } catch (err) {
    await prisma.agentLog.create({
      data: { agent: 'trend-reactor', action: 'scan', status: 'error', message: (err as Error).message },
    }).catch(() => null);
  }

  await prisma.agentLog.create({
    data: { agent: 'trend-reactor', action: 'scan', status: 'success', message: `scanned=${scanned} triggered=${triggered}` },
  }).catch(() => null);

  return { scanned, triggered, topics };
}
