// Affiliate-Optimizer agent — runs every few hours over the last 14 days of
// published articles and re-applies the Amazon link injection. Catches cases
// where the writer initially missed a product mention (e.g. wrote "RTX 5090"
// in a paragraph the regex didn't reach the first time) OR where new products
// got added to PRODUCT_KEYWORDS after the article was written.
//
// Idempotent: injectAmazonLinks() only ever adds ONE link per product per
// article and skips text already inside markdown link syntax. So running the
// agent twice on the same article is a no-op.
//
// We also track per-article how many affiliate links exist now vs before, and
// log a Telegram alert when we've added 5+ in one run (suggests the writer is
// systematically missing things in a category we should investigate).

import { prisma } from '../db';
import { tg } from '../telegram';
import { injectAmazonLinks } from '../affiliate';

export type AffiliateOptimizerReport = {
  scanned: number;
  enriched: number;
  totalLinksAdded: number;
  detail: { slug: string; added: number }[];
};

export async function runAffiliateOptimizer(opts?: { sinceDays?: number; limit?: number }): Promise<AffiliateOptimizerReport> {
  const sinceDays = Math.max(1, Math.min(60, opts?.sinceDays ?? 14));
  const limit = Math.max(1, Math.min(200, opts?.limit ?? 60));
  const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);

  // Pull recent articles, both languages. The translation table holds the DE
  // copy — we re-inject on that too so DE articles also get amazon.de links.
  const articles = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: { id: true, slug: true, content: true, category: true },
  });

  const detail: { slug: string; added: number }[] = [];
  let totalLinksAdded = 0;

  for (const a of articles) {
    // EN content
    const { content: newEn, injected: enAdded } = injectAmazonLinks(a.content, 'en');
    if (enAdded > 0 && newEn !== a.content) {
      await prisma.article.update({ where: { id: a.id }, data: { content: newEn } });
      detail.push({ slug: a.slug, added: enAdded });
      totalLinksAdded += enAdded;
    }

    // DE translation (if present)
    const tr = await prisma.translation.findUnique({ where: { articleId_lang: { articleId: a.id, lang: 'de' } } });
    if (tr) {
      const { content: newDe, injected: deAdded } = injectAmazonLinks(tr.content, 'de');
      if (deAdded > 0 && newDe !== tr.content) {
        await prisma.translation.update({ where: { articleId_lang: { articleId: a.id, lang: 'de' } }, data: { content: newDe } });
        totalLinksAdded += deAdded;
        // Don't push duplicate detail entry — slug already recorded above (or, if
        // EN had 0 added, add it now with DE count).
        const existing = detail.find((d) => d.slug === a.slug);
        if (existing) existing.added += deAdded;
        else detail.push({ slug: a.slug, added: deAdded });
      }
    }
  }

  // Alert if the haul is meaningful — signals the writer is missing things
  if (totalLinksAdded >= 5) {
    const lines = [`💰 Affiliate-Optimizer · ${totalLinksAdded} neue Links in ${detail.length} Artikeln`, ''];
    for (const d of detail.slice(0, 10)) {
      lines.push(`  · +${d.added} → ${d.slug}`);
    }
    await tg(lines.join('\n'));
  }

  await prisma.agentLog.create({
    data: {
      agent: 'affiliate-optimizer',
      action: 'run',
      status: 'success',
      message: `scanned=${articles.length} enriched=${detail.length} added=${totalLinksAdded}`,
      meta: JSON.stringify(detail.slice(0, 20)),
    },
  });

  return {
    scanned: articles.length,
    enriched: detail.length,
    totalLinksAdded,
    detail,
  };
}
