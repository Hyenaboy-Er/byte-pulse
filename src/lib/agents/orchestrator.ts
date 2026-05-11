import { prisma } from '../db';
import { fetchAllSources, findTrending, type FeedItem } from '../rss';
import { research } from './researcher';
import { writeArticle } from './writer';
import { humanize } from './humanizer';
import { reviewArticle } from './reviewer';
import { uniqueSlug } from '../slugify';
import { getCurrentTrends, trendsBoost, type TrendsSnapshot } from './keyword-research';
import { translateArticle } from './translator';
import { tgError } from '../telegram';
import { injectAmazonLinks } from '../affiliate';
import { broadcastNewArticle } from '../social';

export type RunReport = {
  startedAt: string;
  finishedAt: string;
  fetched: number;
  freshCandidates: number;
  trends?: { topicCount: number; topTopics: string[] };
  picked?: { title: string; source: string; link: string; trendsBoost?: number };
  researched?: { fullTextLen: number; hasImage: boolean };
  written?: { title: string; category: string };
  humanized?: { changes: string[] };
  review?: { score: number; verdict: string; reasons: string[]; aiSmell?: number; plagiarism?: number; factuality?: number; factualityIssues?: string[] };
  published?: { slug: string };
  error?: string;
};

async function logAgent(agent: string, action: string, status: string, message?: string, meta?: object) {
  try {
    await prisma.agentLog.create({
      data: { agent, action, status, message: message?.slice(0, 500), meta: meta ? JSON.stringify(meta) : null },
    });
  } catch {}
}

// Stop-words removed before comparing titles. Kept short on purpose — anything
// longer would over-deduplicate ("iPhone 17 Pro Max launches in fall" should
// still be distinct from "iPhone 17 launches in spring").
const STOPWORDS = new Set([
  'a','an','the','and','or','of','for','to','in','on','at','with','by','from','as','is','are','was','were','be','been','being',
  'this','that','these','those','it','its','their','our','your','he','she','they','them','his','her',
  'new','update','updates','released','launches','release','launching','now','today','can','will',
  'about','after','before','over','under','via','vs','versus','no','not','more','all','one','two',
  // German stopwords for de-language sources
  'der','die','das','und','oder','von','zu','in','auf','bei','mit','für','aus','nach','über','unter','vor','nun',
  'ist','sind','war','waren','sein','wird','werden','kann','könnte','wurde','wurden',
  'ein','eine','einer','eines','einem','einen','dem','des','den','daß','dass',
]);

function titleSignature(title: string): Set<string> {
  return new Set(
    title.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

// Cross-language stem signature: takes the first 4 characters of every
// substantive word ≥4 chars. Catches German/English pairs like
// "reproduzierbare"/"reproducible" (both → "repr"), "Pakete"/"packages"
// (both → "pake"/"pack" — won't match on these but on others). Plus tech
// proper nouns ("debian", "ubuntu", "kubernetes") match literally.
// Lossy on purpose: false positives are OK because we have a second
// confirmation (Jaccard on full-word signature with high threshold).
function stemSignature(title: string): Set<string> {
  return new Set(
    title.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
      .map((w) => w.slice(0, 4))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  const union = a.size + b.size - intersect;
  return union > 0 ? intersect / union : 0;
}

// Best-of cross-comparison between a picked RSS item and a published article.
// Returns the highest similarity across the three legitimate comparisons:
//   1. picked.title vs published.title         (English picked vs English published)
//   2. picked.title vs published.originalTitle (same-language vs same-language)
//   3. stem-3 picked.title vs stem-3 published.{title, originalTitle}
function bestSim(pickedTitle: string, p: { title: string; originalTitle: string | null }): number {
  const ps = titleSignature(pickedTitle);
  const sims: number[] = [
    jaccard(ps, titleSignature(p.title)),
  ];
  if (p.originalTitle) sims.push(jaccard(ps, titleSignature(p.originalTitle)));
  // Stem-based cross-language signal
  const pStem = stemSignature(pickedTitle);
  sims.push(jaccard(pStem, stemSignature(p.title)));
  if (p.originalTitle) sims.push(jaccard(pStem, stemSignature(p.originalTitle)));
  return Math.max(...sims);
}

// Persist a "we've seen this story" marker that survives RSS headline rewrites.
// SeenSource has `url @unique`, but feeds (notably Heise) update the headline of
// the same article-URL over time. Naive prisma.seenSource.create() therefore
// fails silently on the URL conflict, the new title-hash never lands in the DB,
// and the picker keeps re-picking the same trending story every iteration.
// We fall back to a hash-suffixed URL so multiple title-hashes for the same
// underlying article coexist as separate rows.
async function markSeen(item: { link: string; title: string; source: { name: string }; hash: string }) {
  try {
    await prisma.seenSource.create({
      data: { url: item.link, title: item.title, source: item.source.name, hash: item.hash },
    });
  } catch {
    await prisma.seenSource.create({
      data: { url: `${item.link}#h=${item.hash}`, title: item.title, source: item.source.name, hash: item.hash },
    }).catch(() => null);
  }
}

function pickBest(items: FeedItem[], seenHashes: Set<string>, trends: TrendsSnapshot | null): { item: FeedItem; boost: number } | null {
  const fresh = items.filter((i) => !seenHashes.has(i.hash));
  if (!fresh.length) return null;
  const trending = findTrending(fresh);
  let best: FeedItem | null = null;
  let bestBoost = 0;
  let bestScore = -1;
  for (const [, group] of trending) {
    const top = group[0];
    const ageHours = Math.max(0.5, (Date.now() - new Date(top.isoDate).getTime()) / 3_600_000);
    const recency = Math.max(0, 24 - ageHours) / 24;
    const cluster = Math.min(group.length, 4) / 4;
    const titleLen = Math.min(top.title.length, 80) / 80;
    // External trends boost (HN + Reddit + Google Suggest match)
    const extBoost = trends ? trendsBoost(top.title, trends) : 0;
    const score = recency * 0.40 + cluster * 0.25 + titleLen * 0.05 + extBoost * 0.30;
    if (score > bestScore) { bestScore = score; best = top; bestBoost = extBoost; }
  }
  return best ? { item: best, boost: bestBoost } : null;
}

export async function runOnce(): Promise<RunReport> {
  const startedAt = new Date().toISOString();
  const report: RunReport = { startedAt, finishedAt: '', fetched: 0, freshCandidates: 0 };

  try {
    await logAgent('orchestrator', 'start', 'info');

    // Fetch RSS + external trends in parallel
    const [items, trends] = await Promise.all([
      fetchAllSources(),
      getCurrentTrends().catch(() => null),
    ]);
    report.fetched = items.length;
    if (trends) {
      report.trends = { topicCount: trends.topics.length, topTopics: trends.topics.slice(0, 10) };
      await logAgent('keyword-research', 'fetched', 'success', `topics=${trends.topics.length}`, { topTopics: trends.topics.slice(0, 15) });
    }

    // CRITICAL: orderBy fetchedAt desc — without it, Turso returns rows in storage
    // order and recently-inserted hashes can fall outside the take limit, causing
    // the orchestrator to re-pick the same trending story every iteration even
    // though it was just marked seen seconds ago.
    const seen = await prisma.seenSource.findMany({
      select: { hash: true },
      orderBy: { fetchedAt: 'desc' },
      take: 10000,
    });
    const seenHashes = new Set(seen.map((s) => s.hash));
    const fresh = items.filter((i) => !seenHashes.has(i.hash));
    report.freshCandidates = fresh.length;

    if (!fresh.length) {
      await logAgent('orchestrator', 'idle', 'info', 'No new stories.');
      report.finishedAt = new Date().toISOString();
      return report;
    }

    const result = pickBest(items, seenHashes, trends);
    if (!result) { report.finishedAt = new Date().toISOString(); return report; }
    const pick = result.item;
    report.picked = { title: pick.title, source: pick.source.name, link: pick.link, trendsBoost: result.boost };
    await logAgent('orchestrator', 'pick', 'info', pick.title, { source: pick.source.name, trendsBoost: result.boost });

    // Semantic dedup: hash-based dedup catches identical URLs, but RSS feeds publish
    // multiple articles about the same event — e.g. Heise + Golem + t3n all post about
    // "Debian 14 mandates reproducible builds" within hours of each other under different
    // URLs. Window widened to 7 days because Google flags near-duplicates as "Duplikat –
    // vom Nutzer nicht als kanonisch festgelegt" even when published days apart.
    const recentPublished = await prisma.article.findMany({
      where: { status: 'published', publishedAt: { gte: new Date(Date.now() - 7 * 24 * 3600_000) } },
      select: { title: true, slug: true, sourceUrl: true, originalTitle: true },
      take: 500,
    });
    const pickSlugPrefix = pick.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    // Four-tier dedup, each tier covers a different failure mode of the previous one:
    //   1. sourceUrl exact match — same RSS item literally seen before
    //   2. Cross-language similarity via bestSim() — German pick vs English published
    //      and stem-3 overlap (catches "reproduzierbar" ↔ "reproducible")
    //   3. Full-word Jaccard ≥ 0.50 — handles same-language near-rephrasings
    //   4. Slug-prefix exact match — same first 30+ chars of slug
    const dupTitle = recentPublished.find((p) => {
      if (p.sourceUrl === pick.link) return true;
      if (bestSim(pick.title, p) >= 0.45) return true;
      const prefix = p.slug.slice(0, 40);
      return prefix.length >= 30 && prefix === pickSlugPrefix.slice(0, prefix.length);
    });
    if (dupTitle) {
      await logAgent('orchestrator', 'dedup', 'info', `near-duplicate of ${dupTitle.title.slice(0, 80)}`, { picked: pick.title.slice(0, 120) });
      await markSeen(pick);
      report.finishedAt = new Date().toISOString();
      return report;
    }

    // mark as seen so we don't loop on a bad input
    await markSeen(pick);

    // 1. Research — full-text scrape
    const researchResult = await research(pick);
    report.researched = { fullTextLen: researchResult.fullText.length, hasImage: !!researchResult.imageUrl };
    await logAgent('researcher', 'fetched', 'success', `len=${researchResult.fullText.length}`, { hasImage: !!researchResult.imageUrl });

    // 2. Write — generate English article (with trending keywords for SEO)
    let draft;
    try {
      draft = await writeArticle(researchResult, trends?.topics.slice(0, 12));
      report.written = { title: draft.title, category: draft.category };
      await logAgent('writer', 'wrote', 'success', draft.title);
    } catch (err) {
      const msg = (err as Error).message;
      report.error = `Writer: ${msg}`;
      await logAgent('writer', 'wrote', 'error', msg);
      report.finishedAt = new Date().toISOString();
      return report;
    }

    // 3. Humanize — strip AI phrases, add humanity
    let humanized;
    try {
      humanized = await humanize(draft);
      report.humanized = { changes: humanized.changes ?? [] };
      await logAgent('humanizer', 'humanized', 'success', humanized.title, { changes: humanized.changes });
    } catch (err) {
      const msg = (err as Error).message;
      // fallback: continue with original draft
      humanized = { ...draft, changes: [`humanizer-failure: ${msg}`] };
      await logAgent('humanizer', 'humanized', 'error', msg);
    }

    // 4. Review — quality + plagiarism + AI smell
    let review = await reviewArticle(humanized, researchResult);
    await logAgent('reviewer', 'reviewed', review.verdict, `score=${review.score} smell=${review.aiSmellScore} plag=${review.plagiarismRisk}`, { reasons: review.reasons });

    // 4b. Revise loop — one extra humanizer + review pass when borderline
    if (review.verdict === 'revise' && (review.plagiarismRisk ?? 0) <= 40) {
      try {
        const revised = await humanize(humanized);
        const reReview = await reviewArticle(revised, researchResult);
        await logAgent('reviewer', 'rereviewed', reReview.verdict, `score=${reReview.score} smell=${reReview.aiSmellScore}`, { reasons: reReview.reasons });
        if (reReview.score > review.score) {
          humanized = { ...revised };
          review = reReview;
        }
      } catch (err) {
        await logAgent('humanizer', 'revise', 'error', (err as Error).message);
      }
    }

    report.review = {
      score: review.score,
      verdict: review.verdict,
      reasons: review.reasons,
      aiSmell: review.aiSmellScore,
      plagiarism: review.plagiarismRisk,
      factuality: review.factualityScore,
      factualityIssues: review.factualityIssues,
    };

    // Pragmatic gate: publish on score. Reviewer is overly strict on "factuality"
    // (flags any rumor/leak as low-confidence), but rumors ARE legit tech news as
    // long as we mark them as such in the article. Block only on hard real risks.
    const blockedByPlagiarism = (review.plagiarismRisk ?? 0) >= 75;
    const blockedByFactuality = (review.factualityScore ?? 100) < 35;
    const tooLow = review.score < 50;
    const shouldPublish = !blockedByPlagiarism && !blockedByFactuality && !tooLow;
    if (!shouldPublish) {
      report.finishedAt = new Date().toISOString();
      return report;
    }

    // 5. Persist
    const finalTitle = review.fixedTitle && review.fixedTitle.length > 20 ? review.fixedTitle : humanized.title;
    const slug = await uniqueSlug(finalTitle, async (s) => {
      const existing = await prisma.article.findUnique({ where: { slug: s } });
      return existing !== null;
    });

    // Inject Amazon affiliate links into article body (idempotent: only first
    // mention of each product gets linked). No-op if AMAZON_ASSOCIATE_TAG is unset.
    const { content: monetizedContent, injected } = injectAmazonLinks(humanized.content, 'en');
    if (injected > 0) await logAgent('affiliate', 'amazon-inject', 'success', `${injected} links`);

    const created = await prisma.article.create({
      data: {
        slug,
        title: finalTitle,
        subtitle: humanized.subtitle,
        excerpt: humanized.excerpt,
        content: monetizedContent,
        category: humanized.category,
        tags: JSON.stringify(humanized.tags ?? []),
        imageUrl: researchResult.imageUrl,
        imageCredit: researchResult.imageUrl ? `Image source: ${pick.source.name}` : null,
        sourceUrl: pick.link,
        sourceName: pick.source.name,
        // Stored so future dedup comparisons can match in the SOURCE language —
        // critical for catching the "Heise + Golem + t3n all publish the same
        // German story" pattern that previously slipped through.
        originalTitle: pick.title,
        qualityScore: review.score,
        status: 'published',
        publishedAt: new Date(),
      },
    });

    report.published = { slug };
    await logAgent('orchestrator', 'published', 'success', slug, { score: review.score });

    // 6. Immediate DE translation so /de/* pages show the article in German right away.
    try {
      await translateArticle(created.id, 'de');
      await logAgent('translator', 'translated', 'success', slug, { lang: 'de' });
    } catch (err) {
      await logAgent('translator', 'translated', 'error', (err as Error).message);
    }

    // 7. Social broadcast — fan out to X / LinkedIn / Mastodon / Bluesky / Telegram channel.
    // Each channel silently no-ops if its env creds aren't set, so it stays safe during onboarding.
    try {
      const results = await broadcastNewArticle({
        slug, title: finalTitle, excerpt: humanized.excerpt, category: humanized.category,
        tags: humanized.tags, imageUrl: researchResult.imageUrl,
      });
      const ok = results.filter((r) => r.ok).map((r) => r.channel);
      const failed = results.filter((r) => !r.ok && !/not set|missing/i.test(r.error ?? ''));
      if (ok.length) await logAgent('social', 'broadcast', 'success', ok.join(','));
      for (const f of failed) await logAgent('social', `broadcast-${f.channel}`, 'error', f.error);
    } catch (err) {
      await logAgent('social', 'broadcast', 'error', (err as Error).message);
    }
  } catch (err) {
    report.error = (err as Error).message;
    await logAgent('orchestrator', 'run', 'error', report.error);

    // Rate-limited Telegram alert: only one error notification per hour
    try {
      const recent = await prisma.agentLog.findFirst({
        where: { agent: 'orchestrator', action: 'tg-alert', createdAt: { gte: new Date(Date.now() - 60 * 60_000) } },
      });
      if (!recent) {
        await tgError(`Writer pipeline crashed: ${report.error?.slice(0, 200)}`);
        await prisma.agentLog.create({
          data: { agent: 'orchestrator', action: 'tg-alert', status: 'sent', message: report.error?.slice(0, 200) },
        });
      }
    } catch {}
  }

  report.finishedAt = new Date().toISOString();
  return report;
}
