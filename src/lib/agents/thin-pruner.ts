// Thin-Pruner — the honest, Google-endorsed accelerator to AdSense
// readiness. Google's own guidance for thin content: "improve OR
// REMOVE". Rewriting 200 worthless legacy stubs takes weeks; de-indexing
// the genuinely valueless ones is instant, legitimate, and loses nothing
// (they have zero traffic).
//
// Mechanism (NO DB migration): set qualityScore = -1 as a "de-indexed"
// sentinel. The article page still RENDERS (no 404, links intact) but
// emits robots:noindex; sitemaps + the readiness scorers exclude it.
// Google then evaluates only the indexable, good corpus → the honest
// AdSense-readiness rises because the junk is no longer part of the site
// Google judges. Fully reversible (flip qualityScore back).
//
// HARD SAFETY GUARDRAILS — ALL must hold before a single article is
// touched. Conservative on purpose: never remove anything with value.
//   - body < 500 words      (genuinely thin; 500-700 left for rescue)
//   - views < 2             (no traffic → nothing lost)
//   - published > 21d ago   (never new content / the live pipeline)
//   - NOT founder/longform  (sourceName !== "<SITE> Original")
//   - not already pruned    (qualityScore >= 0)

import { prisma } from '../db';
import { SITE } from '../site';

const MIN_WORDS = 500;
const MAX_VIEWS = 2;
// 7 (was 21): on a ~3-week-old domain almost nothing is >21d old, so
// the pruner found 0 eligible and did nothing. 7d is still safe — the
// writer pipeline has long moved on, and combined with <500w + <2 views
// + not-founder-longform it only ever hits genuine 0-traffic junk.
const MIN_AGE_DAYS = 7;
const MAX_PER_RUN = 80; // cheap DB updates; bounded so it drains visibly, not all at once

const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export type ThinPrunerReport = {
  scanned: number;
  eligible: number;
  pruned: number;
  remainingThin: number;
  slugs: string[];
  diag?: Record<string, unknown>;
};

// DIAGNOSE — no writes. Answers exactly WHY the pruner finds 0 eligible:
// per-guardrail counts + the publishedAt-vs-createdAt bump comparison.
export async function diagnoseThinPruner(): Promise<Record<string, unknown>> {
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 3600_000);
  const rows = await prisma.article.findMany({
    where: { status: 'published', qualityScore: { gte: 0 } },
    orderBy: { createdAt: 'asc' },
    select: { content: true, views: true, publishedAt: true, createdAt: true, sourceName: true },
    take: 2000,
  });
  const thin = rows.filter((r) => wc(r.content) < MIN_WORDS);
  const ageD = (dt: Date | null) => dt ? (now - new Date(dt).getTime()) / 86_400_000 : -1;
  const pubOlder7 = (r: typeof rows[number]) => r.publishedAt !== null && new Date(r.publishedAt) < d7;
  const creOlder7 = (r: typeof rows[number]) => new Date(r.createdAt) < d7;
  const notOrig = (r: typeof rows[number]) => r.sourceName !== `${SITE.name} Original`;
  const lowViews = (r: typeof rows[number]) => r.views < MAX_VIEWS;
  const bumped = thin.filter((r) => !pubOlder7(r) && creOlder7(r)).length;
  return {
    totalPublishedUnpruned: rows.length,
    thinUnder500: thin.length,
    'thin&views<2': thin.filter(lowViews).length,
    'thin&publishedAt>7d': thin.filter(pubOlder7).length,
    'thin&createdAt>7d': thin.filter(creOlder7).length,
    'thin&notFounder': thin.filter(notOrig).length,
    'eligible_by_publishedAt(current)': thin.filter((r) => lowViews(r) && pubOlder7(r) && notOrig(r)).length,
    'eligible_by_createdAt(proposed)': thin.filter((r) => lowViews(r) && creOlder7(r) && notOrig(r)).length,
    'thin_bumped(pubRecent_butCreated>7d)': bumped,
    sample_oldest_thin_ages: thin.slice(0, 5).map((r) => ({ pubAgeD: +ageD(r.publishedAt).toFixed(1), creAgeD: +ageD(r.createdAt).toFixed(1), views: r.views })),
  };
}

export async function runThinPruner(opts: { max?: number } = {}): Promise<ThinPrunerReport> {
  const max = opts.max ?? MAX_PER_RUN;
  const cutoff = new Date(Date.now() - MIN_AGE_DAYS * 24 * 3600_000);

  const candidates = await prisma.article.findMany({
    where: {
      status: 'published',
      qualityScore: { gte: 0 },          // not already pruned
      views: { lt: MAX_VIEWS },          // no traffic
      publishedAt: { lt: cutoff },       // old, not the live pipeline
      sourceName: { not: `${SITE.name} Original` }, // never the flagship longform
    },
    orderBy: { publishedAt: 'asc' },     // oldest junk first
    select: { id: true, slug: true, content: true },
    take: 1500,
  });

  const report: ThinPrunerReport = {
    scanned: candidates.length, eligible: 0, pruned: 0, remainingThin: 0, slugs: [],
  };

  const tooThin = candidates.filter((a) => wc(a.content) < MIN_WORDS);
  report.eligible = tooThin.length;

  for (const a of tooThin.slice(0, max)) {
    try {
      await prisma.article.update({
        where: { id: a.id },
        data: { qualityScore: -1 },
      });
      report.pruned++;
      if (report.slugs.length < 20) report.slugs.push(a.slug);
    } catch { /* skip individual failures */ }
  }
  report.remainingThin = report.eligible - report.pruned;

  await prisma.agentLog.create({
    data: {
      agent: 'thin-pruner', action: 'prune',
      status: 'success',
      message: `scanned=${report.scanned} eligible=${report.eligible} pruned=${report.pruned} remaining=${report.remainingThin}`,
    },
  }).catch(() => null);

  return report;
}
