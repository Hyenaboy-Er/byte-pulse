// Internal-Linker Agent — automatic internal cross-linking.
//
// Google ranks well-interconnected sites significantly higher. The signal is:
// 'pages that other pages on the site link to, with relevant anchor text,
// from semantically related contexts'. Most low-traffic sites have one or
// zero internal links per article — fixing this is the single biggest
// on-page SEO lever we have.
//
// How it works:
// 1. Pull recent articles (default last 30 days).
// 2. Build a slug→title+tags index of all published articles for matching.
// 3. For each article, scan the body for product/topic mentions that match
//    OTHER articles' titles or tags.
// 4. Replace first occurrence of each match with [text](/article/<slug>).
//    Skip already-linked text and headlines.
// 5. Cap at 4 internal links per article (Google penalises link-spam).
// 6. Persist back to DB + re-ping IndexNow.

import { prisma } from '../db';
import { tg } from '../telegram';
import { pingIndexNow } from '../indexnow';
import { SITE } from '../site';

const SITE_URL = SITE.url;
const MAX_LINKS_PER_ARTICLE = 4;
const MIN_ANCHOR_LENGTH = 8; // skip short anchors that match too easily

export type InternalLinkerReport = {
  scanned: number;
  enriched: number;
  totalLinksAdded: number;
  examples: { slug: string; added: number; linkedTo: string[] }[];
};

// Build a search index of {keyword: targetSlug} from all published articles.
// We extract candidate keywords from article TITLES (cleaned) and TAGS.
function buildLinkIndex(articles: { slug: string; title: string; tags: string }[]): Map<string, string> {
  const idx = new Map<string, string>();
  for (const a of articles) {
    // Title-based keywords: strip leading article and meta-noise
    const title = a.title.trim();
    // Skip if too short or generic
    if (title.length < MIN_ANCHOR_LENGTH) continue;
    // Add the full title (lowercased) as a strong-signal candidate
    idx.set(title.toLowerCase(), a.slug);
    // Tag-based candidates: a tag becomes a link target when mentioned in body
    let tags: string[] = [];
    try { tags = JSON.parse(a.tags) as string[]; } catch {}
    for (const t of tags.slice(0, 5)) {
      const tagLc = t.toLowerCase().trim();
      if (tagLc.length >= MIN_ANCHOR_LENGTH && !idx.has(tagLc)) {
        idx.set(tagLc, a.slug);
      }
    }
  }
  return idx;
}

// Escape regex meta-chars in user-provided text before building a regex.
function reEscape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Inject up to MAX_LINKS_PER_ARTICLE internal links into markdown.
// Returns the new markdown and the list of slugs we linked to.
export function injectInternalLinks(
  markdown: string,
  selfSlug: string,
  index: Map<string, string>,
): { content: string; linkedSlugs: string[] } {
  if (!markdown || !index.size) return { content: markdown, linkedSlugs: [] };

  // 1. Build a list of regions inside markdown links + heading lines so we
  //    don't replace inside [..](..) or under `## Heading`.
  const linkRanges: [number, number][] = [];
  for (const m of markdown.matchAll(/\[[^\]]*\]\([^)]*\)/g)) {
    if (m.index !== undefined) linkRanges.push([m.index, m.index + m[0].length]);
  }
  const headingRanges: [number, number][] = [];
  // Match heading lines (lines that start with one or more #)
  const lines = markdown.split('\n');
  let cursor = 0;
  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) headingRanges.push([cursor, cursor + line.length]);
    cursor += line.length + 1; // +1 for newline
  }
  const inProtected = (idx: number) =>
    linkRanges.some(([a, b]) => idx >= a && idx < b) ||
    headingRanges.some(([a, b]) => idx >= a && idx < b);

  // 2. Build search list: longer keywords first (more specific match wins)
  const keywords = Array.from(index.entries())
    .filter(([_, slug]) => slug !== selfSlug) // never link to self
    .sort((a, b) => b[0].length - a[0].length);

  let content = markdown;
  const linkedSlugs = new Set<string>();
  for (const [keyword, slug] of keywords) {
    if (linkedSlugs.size >= MAX_LINKS_PER_ARTICLE) break;
    if (linkedSlugs.has(slug)) continue;

    // Case-insensitive whole-word search; only first match counts
    const re = new RegExp(`\\b${reEscape(keyword)}\\b`, 'i');
    const m = re.exec(content);
    if (!m || m.index === undefined) continue;
    if (inProtected(m.index)) continue;

    const matched = m[0];
    const before = content.slice(0, m.index);
    const after = content.slice(m.index + matched.length);
    content = `${before}[${matched}](/article/${slug})${after}`;

    // Recompute link ranges to include the one we just added (cheap: extend list)
    const newStart = m.index;
    const newEnd = newStart + matched.length + 5 + slug.length + 10; // approx
    linkRanges.push([newStart, newEnd]);
    linkedSlugs.add(slug);
  }

  return { content, linkedSlugs: Array.from(linkedSlugs) };
}

export async function runInternalLinker(opts?: { sinceDays?: number; limit?: number; minViews?: number }): Promise<InternalLinkerReport> {
  const sinceDays = Math.max(1, Math.min(60, opts?.sinceDays ?? 30));
  const limit = Math.max(1, Math.min(100, opts?.limit ?? 40));
  const minViews = Math.max(0, opts?.minViews ?? 0);
  const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);

  // Pull all published articles to build the link index from + the subset we
  // want to enrich. The index needs the full corpus for good matching;
  // enrichment focuses on the most recent or highest-traffic articles.
  const allPublished = await prisma.article.findMany({
    where: { status: 'published' },
    select: { id: true, slug: true, title: true, tags: true },
    take: 1000,
  });
  const index = buildLinkIndex(allPublished);

  // Already-linked tracker (idempotency via agentLog)
  const linkedSlugs = new Set(
    (await prisma.agentLog.findMany({
      where: { agent: 'internal-linker', action: 'link', status: 'success' },
      select: { message: true },
    }))
      .map((l) => (l.message ?? '').split('|')[0])
      .filter(Boolean)
  );

  const candidates = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: since }, views: { gte: minViews } },
    orderBy: [{ publishedAt: 'desc' }],
    take: limit * 2,
    select: { id: true, slug: true, content: true },
  });

  const examples: InternalLinkerReport['examples'] = [];
  let totalLinksAdded = 0;
  let enriched = 0;
  let scanned = 0;

  for (const a of candidates) {
    if (enriched >= limit) break;
    if (linkedSlugs.has(a.slug)) continue;
    scanned++;

    const { content: newContent, linkedSlugs: addedSlugs } = injectInternalLinks(a.content, a.slug, index);
    if (addedSlugs.length === 0 || newContent === a.content) {
      // Log as 'kept' so we don't re-scan on next run
      await prisma.agentLog.create({
        data: { agent: 'internal-linker', action: 'link', status: 'success', message: `${a.slug}|kept` },
      }).catch(() => null);
      continue;
    }

    await prisma.article.update({ where: { id: a.id }, data: { content: newContent } });
    enriched++;
    totalLinksAdded += addedSlugs.length;
    examples.push({ slug: a.slug, added: addedSlugs.length, linkedTo: addedSlugs });

    await prisma.agentLog.create({
      data: {
        agent: 'internal-linker',
        action: 'link',
        status: 'success',
        message: `${a.slug}|added=${addedSlugs.length}`,
        meta: JSON.stringify({ linkedTo: addedSlugs }),
      },
    }).catch(() => null);

    // Re-ping IndexNow so Google + Bing re-crawl quickly
    pingIndexNow([`${SITE_URL}/article/${a.slug}`, `${SITE_URL}/de/article/${a.slug}`]).catch(() => null);
  }

  if (totalLinksAdded >= 5) {
    const lines = [`🔗 Internal-Linker · ${totalLinksAdded} interne Links in ${enriched} Artikeln`, ''];
    for (const e of examples.slice(0, 6)) {
      lines.push(`  · +${e.added} → ${e.slug}`);
    }
    await tg(lines.join('\n'));
  }

  return { scanned, enriched, totalLinksAdded, examples };
}
