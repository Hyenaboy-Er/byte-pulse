// Quality-Upgrade agent (#26) — the AdSense-readiness lever.
//
// Problem: 412 published articles, avg 364 words. Almost all were written
// BEFORE the humanizer length-fix, so they're thin AI-rewrites of news —
// exactly the "low value / scaled content" profile that gets AdSense
// applications rejected and that Google's Helpful-Content system demotes.
// content-refresher only APPENDS a 60-120w update (freshness signal), it
// does NOT fix thinness.
//
// This agent rewrites a thin article's BODY into a substantial 900-1300w
// piece: keeps every fact/number/source/quote and the core thesis, but
// deepens it with context, a "what this means for you" angle, an honest
// "what's still unclear", and a closing take — the same original-value
// structure the post-fix writer produces. No new facts invented. Slug,
// title and URL never change (canonicalisation + existing links/SEO stay
// intact). After upgrade: revalidate the page + ping IndexNow so Bing/
// Google re-crawl the now-substantial version.
//
// We do NOT noindex/unpublish thin articles — that would 404 working URLs
// and throw away whatever links/traffic they have. Expansion is the
// universal fix; on genuine failure we just skip and retry another day.
//
// Dedup via agentLog action `quality-upgrade-<id>` (status ok) so an
// article is never reprocessed. Batched (small N/run) to fit the 60s
// Vercel cap and keep LLM cost predictable. Drains ~N/day via /api/daily.

import { prisma } from '../db';
import { llmChat, extractJson } from '../llm';
import { pingIndexNow } from '../indexnow';
import { SITE } from '../site';

const SITE_URL = SITE.url;
const WORD_FLOOR = 700;        // below this = "thin", needs upgrade
const TARGET_MIN = 820;        // don't ship an upgrade that's still thin
// Scan the WHOLE published corpus, not just the oldest 50. The thin
// backlog (~400 pre-humanizer-fix articles) is spread across ALL of them;
// a 50-window meant once the oldest 50 were upgraded the agent reported
// thinFound=0 forever and never touched articles 51-400. One findMany of
// id+slug+content for the corpus is cheap; the loop still does at most
// maxPerRun LLM calls so the 60s cap is unaffected.
const SCAN_WINDOW = 1000;      // effectively the whole corpus
// Vercel Hobby hard-caps functions at 60s. A 6000-token writer call blew
// past it (504) even for ONE article. An ~850-1050w body is ~1400 output
// tokens; 3200 leaves JSON headroom and generates fast enough to finish
// one upgrade well inside 60s. One per daily run — slow but reliable;
// the backlog drains steadily and never times out.
const MAX_TOKENS = 3200;

const SYSTEM = `You are a veteran tech editor rewriting a thin, AI-sounding article into a
substantial, genuinely useful piece for Byte-Pulse. You are EXPANDING and DEEPENING,
not summarising and not inventing.

HARD RULES:
- Keep EVERY fact, number, name, date, quote and the source attribution exactly.
- Keep the core thesis and the headline's promise. Do NOT change the topic.
- NEVER invent specifics (no fake benchmarks, prices, dates, or "Apple confirmed X").
  If you don't know a detail, add analysis/context instead of fabricating.
- Output 850-1050 words of Markdown: 6-8 paragraphs, 3 ## subheadings,
  one short bullet list where it fits, plus these sections woven in:
  • a "Context" paragraph (industry background, EU angle where relevant)
  • a "What this means for you" paragraph (concrete reader impact)
  • a "What's still unclear" paragraph (honest open questions)
  • a closing 2-3 sentence editorial take
- Voice: warm, plainspoken, varied sentence length, contractions, no
  "in conclusion", "it's worth noting", "game-changing", "in the realm of",
  no breathless hype. Neutral — don't shill or trash any company.

Reply with JSON only: { "content": "<full expanded Markdown body>" }`;

function wc(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export type QualityUpgradeReport = {
  scanned: number;
  thinFound: number;
  upgraded: number;
  skipped: number;
  errors: string[];
  examples: { slug: string; before: number; after: number }[];
};

export async function runQualityUpgrade(opts?: { maxPerRun?: number }): Promise<QualityUpgradeReport> {
  const maxPerRun = Math.max(1, Math.min(6, opts?.maxPerRun ?? 1));
  const report: QualityUpgradeReport = {
    scanned: 0, thinFound: 0, upgraded: 0, skipped: 0, errors: [], examples: [],
  };

  // Oldest published first — the thin backlog is the early articles. Pull a
  // window, skip ones already upgraded, process the thin ones among them.
  const candidates = await prisma.article.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'asc' },
    take: SCAN_WINDOW,
    select: { id: true, slug: true, title: true, content: true, category: true, sourceName: true },
  });
  report.scanned = candidates.length;

  let done = 0;
  for (const a of candidates) {
    if (done >= maxPerRun) break;

    const before = wc(a.content);
    if (before >= WORD_FLOOR) continue;        // already substantial
    report.thinFound++;

    // Already upgraded? (idempotent — never reprocess)
    const seen = await prisma.agentLog.findFirst({
      where: { agent: 'quality', action: `quality-upgrade-${a.id}`, status: 'ok' },
      select: { id: true },
    });
    if (seen) { report.skipped++; continue; }

    let expanded: string | null = null;
    try {
      const raw = await llmChat({
        role: 'writer',
        system: SYSTEM,
        user: `Title: ${a.title}
Source: ${a.sourceName}
Category: ${a.category}
Current length: ${before} words (too thin).

Current body:
"""
${a.content}
"""

Rewrite into a substantial 850-1050 word version per the rules. Same facts, deeper.`,
        maxTokens: MAX_TOKENS,
        json: true,
      });
      const parsed = extractJson<{ content: string }>(raw);
      expanded = parsed?.content ?? null;
    } catch (e) {
      report.errors.push(`llm ${a.slug}: ${(e as Error).message}`);
    }

    if (!expanded || wc(expanded) < TARGET_MIN) {
      // Don't ship a still-thin or failed rewrite. Skip — retried another
      // day. We do NOT mark it ok, so it stays in the queue.
      report.skipped++;
      continue;
    }

    try {
      await prisma.article.update({
        where: { id: a.id },
        data: { content: expanded },   // slug/title/publishedAt untouched
      });
      await prisma.agentLog.create({
        data: {
          agent: 'quality',
          action: `quality-upgrade-${a.id}`,
          status: 'ok',
          message: `${a.slug}: ${before}→${wc(expanded)} words`,
        },
      });
      // Make the upgrade visible immediately + tell search engines.
      try {
        const { revalidatePath } = await import('next/cache');
        revalidatePath(`/article/${a.slug}`);
        revalidatePath(`/de/article/${a.slug}`);
      } catch { /* best-effort */ }
      pingIndexNow([`${SITE_URL}/article/${a.slug}`, `${SITE_URL}/de/article/${a.slug}`]).catch(() => null);

      report.upgraded++;
      report.examples.push({ slug: a.slug, before, after: wc(expanded) });
      done++;
    } catch (e) {
      report.errors.push(`save ${a.slug}: ${(e as Error).message}`);
    }
  }

  return report;
}
