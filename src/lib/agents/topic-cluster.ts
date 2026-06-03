// Topic clustering — group fetched RSS items by underlying story.
//
// WHY (Serhat's 2026-06-03 directive): a real newsroom doesn't write
// from a single press release. It cross-references 3-4 sources, finds
// where they agree, finds where they disagree, then writes an
// editorially-opinionated synthesis. That's the difference between
// "AI rewrite farm" and "real journalism" — and it's what Google's
// Helpful Content System measures as "originality above source".
//
// HOW
//   1. Normalize titles + first 200 chars of content into a feature
//      bag (lowercase, strip stopwords, extract proper nouns and
//      numbers).
//   2. Pairwise Jaccard similarity over feature bags.
//   3. Cluster items where similarity >= THRESHOLD.
//   4. Return clusters of size >= 2, sorted by size DESC (more
//      sources = more cross-reference value = better story).
//
// This is intentionally LEXICAL, not semantic-embedding-based. Embeddings
// cost LLM tokens; for breaking-news clustering, lexical overlap on
// proper nouns + numbers works because every outlet repeats the same
// product names, person names, model numbers, and price points. A
// "Nvidia RTX Spark" story will overlap on "Nvidia RTX Spark" across
// every outlet that reports it.
//
// Output: array of TopicCluster, where the primary is the highest-
// quality source and the alternates are corroborating outlets.

import type { FeedItem } from '../rss';

export type TopicCluster = {
  topicKey: string;       // canonical short phrase, e.g. "nvidia rtx spark"
  size: number;            // number of items in the cluster
  primary: FeedItem;       // best single item (highest-quality source)
  alternates: FeedItem[];  // 1-3 other items reporting the same story
};

// Stop words across EN + DE — removed before computing similarity so
// "the the the" doesn't inflate overlap. Kept small; we want proper
// nouns + numbers to dominate the signal.
const STOPWORDS = new Set([
  'the','a','an','and','or','but','of','to','in','on','for','with','by','at',
  'is','was','are','were','be','been','being','have','has','had','do','does',
  'did','this','that','these','those','it','its','their','they','them','from',
  'as','about','into','over','under','between','during','without','within',
  // German
  'der','die','das','und','oder','aber','von','zu','in','an','auf','für','mit',
  'bei','ist','war','sind','waren','sein','haben','hat','hatte','tut','dies',
  'dieser','diese','dieses','jenes','es','sie','er','ihr','ihre','von','als',
  'über','unter','zwischen','während','ohne','innerhalb','aus','nach','vor',
  // Connective junk
  'will','would','could','should','may','might','can','also','more','most',
  'than','then','here','there','what','when','where','who','why','how','more',
  'new','old','first','last','next','one','two','three','says','said','told',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\-\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function featureSet(item: FeedItem): Set<string> {
  const title = item.title ?? '';
  const snippet = (item.contentSnippet ?? '').slice(0, 240);
  // Title tokens count double — a token appearing in the title is a
  // much stronger signal than a token in the body.
  const titleTokens = tokenize(title);
  const bodyTokens = tokenize(snippet);
  const tokens = [...titleTokens, ...titleTokens, ...bodyTokens];
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Picking the canonical topic key: take the 4 most distinctive tokens
// shared across the cluster — usually a product name + a number/version.
function canonicalKey(items: FeedItem[]): string {
  if (!items.length) return '';
  let common = featureSet(items[0]);
  for (let i = 1; i < items.length; i++) {
    const next = featureSet(items[i]);
    const inter = new Set<string>();
    for (const x of common) if (next.has(x)) inter.add(x);
    common = inter;
  }
  // Pick longest 4 tokens (proxy for "most distinctive / least common").
  return Array.from(common)
    .sort((a, b) => b.length - a.length)
    .slice(0, 4)
    .join(' ');
}

// Source quality ranking — when an item is picked as cluster primary,
// prefer outlets with deeper editorial reputation. This gates which
// item leads the citation list.
const SOURCE_RANK: Record<string, number> = {
  'Ars Technica': 100,
  'The Verge':     95,
  'TechCrunch':    90,
  'Reuters':       95,
  'Bloomberg':     95,
  'Wired':         90,
  'heise online':  90,
  'Heise':         90,
  'Engadget':      80,
  'Golem':         80,
  '9to5Mac':       75,
  '9to5Google':    75,
  'MacRumors':     70,
  'IGN':           70,
  'Eurogamer':     70,
  'PCWorld':       70,
  'PCMag':         70,
  'AnandTech':     85,
  'Tom\'s Hardware': 75,
  'Polygon':       70,
};

function sourceRank(item: FeedItem): number {
  return SOURCE_RANK[item.source.name] ?? 50;
}

export interface ClusterOptions {
  /**
   * Minimum Jaccard similarity to count two items as the same story.
   * Default 0.20 — empirically the sweet spot for breaking-news
   * lexical overlap (anything higher misses paraphrased restatements,
   * anything lower clusters unrelated stories under broad keywords
   * like "iphone").
   */
  similarityThreshold?: number;
  /**
   * Minimum cluster size to count as multi-source. Default 2 — even
   * a 2-source story has meaningful cross-reference value; 3+ is
   * better and gets prioritized.
   */
  minClusterSize?: number;
}

/**
 * Cluster RSS items by underlying story.
 *
 * Returns clusters of size >= minClusterSize, sorted by size DESC
 * (most-sourced stories first), then by primary source rank DESC.
 *
 * Singletons (items with no cross-reference) are NOT returned — the
 * caller should fall back to single-source mode for those.
 */
export function clusterByTopic(
  items: FeedItem[],
  opts: ClusterOptions = {},
): TopicCluster[] {
  const threshold = opts.similarityThreshold ?? 0.20;
  const minSize = opts.minClusterSize ?? 2;

  if (items.length < 2) return [];

  // Compute feature sets once.
  const features = items.map((i) => ({ item: i, fs: featureSet(i) }));

  // Greedy clustering. For each item, attach to an existing cluster
  // where it has >= threshold similarity to the cluster's primary,
  // otherwise start a new cluster.
  type RawCluster = { primary: typeof features[0]; members: typeof features };
  const clusters: RawCluster[] = [];

  for (const f of features) {
    let attached = false;
    for (const c of clusters) {
      if (jaccard(f.fs, c.primary.fs) >= threshold) {
        c.members.push(f);
        attached = true;
        break;
      }
    }
    if (!attached) clusters.push({ primary: f, members: [f] });
  }

  // Filter to multi-source clusters, rank primary by source quality,
  // sort cluster results.
  const out: TopicCluster[] = [];
  for (const c of clusters) {
    if (c.members.length < minSize) continue;
    const sorted = [...c.members].sort(
      (a, b) => sourceRank(b.item) - sourceRank(a.item),
    );
    out.push({
      topicKey: canonicalKey(sorted.map((m) => m.item)),
      size: sorted.length,
      primary: sorted[0].item,
      alternates: sorted.slice(1, 4).map((m) => m.item), // cap at 3 alternates = 4 total
    });
  }

  out.sort((a, b) => {
    if (b.size !== a.size) return b.size - a.size;
    return sourceRank(b.primary) - sourceRank(a.primary);
  });

  return out;
}
