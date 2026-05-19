// Translation-Repair agent — the QA control that never existed.
//
// The translator cached every DE translation permanently with ZERO
// validation, and maxTokens:4000 truncated long articles mid-sentence
// (verified live: a 1552-word EN article had an 861-word DE body that
// stopped mid-word). Those broken translations are frozen in the cache
// and would never self-correct.
//
// This agent is the missing controller: it scans cached DE translations,
// flags any whose word count is implausibly short vs the English source
// (truncated / summarised), DELETES the bad cache row, and regenerates it
// via translateArticle() — which now has the length gate + retry, so the
// fresh translation is validated before it is re-cached.
//
// Bounded per run (LLM cost + Vercel 60s cap). Drains the backlog over a
// few daily runs; new truncations can't accumulate because the translator
// gate no longer caches short output.

import { prisma } from '../db';
import { translateArticle } from './translator';

const MIN_RATIO = 0.7;       // same gate as the translator
const SCAN = 500;            // newest N translated articles per run
const MAX_REPair_PER_RUN = 8; // LLM calls/run (~6s each) — fits the 60s budget

const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export type TranslationRepairReport = {
  scanned: number;
  broken: number;
  repaired: number;
  stillBad: number;
  slugs: string[];
};

export async function runTranslationRepair(
  opts: { max?: number } = {},
): Promise<TranslationRepairReport> {
  const max = opts.max ?? MAX_REPair_PER_RUN;
  const report: TranslationRepairReport = {
    scanned: 0, broken: 0, repaired: 0, stillBad: 0, slugs: [],
  };

  const translations = await prisma.translation.findMany({
    where: { lang: 'de' },
    orderBy: { createdAt: 'desc' },
    take: SCAN,
    select: { articleId: true, content: true },
  });
  report.scanned = translations.length;
  if (!translations.length) return report;

  const ids = translations.map((t) => t.articleId);
  const articles = await prisma.article.findMany({
    where: { id: { in: ids }, status: 'published' },
    select: { id: true, slug: true, content: true },
  });
  const artById = new Map(articles.map((a) => [a.id, a]));

  // Identify truncated translations (DE far shorter than EN source).
  const broken: { articleId: string; slug: string }[] = [];
  for (const t of translations) {
    const a = artById.get(t.articleId);
    if (!a) continue;
    const src = wc(a.content);
    if (src < 200) continue; // too short to judge reliably
    const ratio = wc(t.content) / src;
    if (ratio < MIN_RATIO) broken.push({ articleId: t.articleId, slug: a.slug });
  }
  report.broken = broken.length;

  for (const b of broken.slice(0, max)) {
    try {
      // Drop the bad cache row so translateArticle regenerates it with
      // the new length gate instead of returning the cached garbage.
      await prisma.translation.delete({
        where: { articleId_lang: { articleId: b.articleId, lang: 'de' } },
      }).catch(() => null);
      const fresh = await translateArticle(b.articleId, 'de');
      const a = artById.get(b.articleId)!;
      const ok = !!fresh && wc(fresh.content) / Math.max(1, wc(a.content)) >= MIN_RATIO;
      if (ok) {
        report.repaired++;
        report.slugs.push(b.slug);
      } else {
        report.stillBad++;
      }
    } catch {
      report.stillBad++;
    }
  }

  return report;
}
