// Multi-source researcher — fetches all sources in a topic cluster
// in parallel, then produces a structured cross-source bundle that
// the synthesis drafter can write from.
//
// This is the file that turns "AI rewrite of one source" into "real
// cross-referenced reporting". The output ISN'T raw concatenated text
// — it's structured: which facts agree across sources, which
// disagree (= news angle), which are unique to one source (= depth
// angle). The drafter then writes editorial synthesis on top of that
// structure, which is exactly what Google's Helpful Content System
// rewards.

import { research, type Research } from './researcher';
import type { FeedItem } from '../rss';
import type { TopicCluster } from './topic-cluster';

export interface SourceTake {
  source: FeedItem;
  fullText: string;
  byline: string | null;
  imageUrl: string | null;
  language: string | null;
  // Length in chars — used by the drafter to know how much each
  // outlet actually said about this story.
  bodyLength: number;
}

export interface MultiSourceBundle {
  topicKey: string;
  primary: SourceTake;
  alternates: SourceTake[];   // 1-3 corroborating outlets
  // A drafter-ready prompt block. Already formatted with source
  // labels, language markers, and length notes so the LLM can
  // attribute correctly. Use this verbatim as the "research" input
  // to the synthesis drafter.
  drafterBundle: string;
  // Convenience accessors for downstream agents that still expect a
  // single-source Research object (image picker, schema.org, etc).
  // The "primary" view of the bundle.
  asPrimaryResearch(): Research;
  // For schema.org citation array — every source's URL + name.
  citationList: Array<{ name: string; url: string }>;
}

/**
 * Fetch all sources in a cluster in parallel, then build a structured
 * bundle. Returns null when fewer than 2 sources successfully fetched
 * (caller should fall back to single-source pipeline).
 */
export async function researchCluster(
  cluster: TopicCluster,
): Promise<MultiSourceBundle | null> {
  const items: FeedItem[] = [cluster.primary, ...cluster.alternates];

  // Fetch in parallel. Failed fetches return null and are filtered
  // out. We tolerate up to half the cluster failing — as long as we
  // keep 2+ sources we still have cross-reference value.
  const settled = await Promise.allSettled(items.map((i) => research(i)));
  const takes: SourceTake[] = [];
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    if (s.status !== 'fulfilled') continue;
    const r = s.value;
    if (!r.fullText || r.fullText.length < 250) continue; // too thin
    takes.push({
      source: items[i],
      fullText: r.fullText,
      byline: r.byline,
      imageUrl: r.imageUrl,
      language: r.language,
      bodyLength: r.fullText.length,
    });
  }
  if (takes.length < 2) return null;

  // Re-rank: primary stays primary if it was fetched; otherwise the
  // longest successful fetch becomes primary.
  const primaryFetched = takes.find((t) => t.source.link === cluster.primary.link);
  const primary = primaryFetched ?? [...takes].sort((a, b) => b.bodyLength - a.bodyLength)[0];
  const alternates = takes.filter((t) => t.source.link !== primary.source.link);

  // Build the drafter bundle. Format: numbered source blocks with
  // language tags + length, so the LLM can attribute precisely and
  // see at a glance which outlet had the most detail on which angle.
  const sections: string[] = [];
  sections.push(`PRIMARY SOURCE [${primary.source.source.name}, ${primary.source.source.lang.toUpperCase()}, ${primary.bodyLength} chars]`);
  sections.push(`Title: ${primary.source.title}`);
  sections.push(`URL:   ${primary.source.link}`);
  if (primary.byline) sections.push(`Byline: ${primary.byline}`);
  sections.push('');
  sections.push('"""');
  sections.push(primary.fullText.slice(0, 4500));
  sections.push('"""');
  sections.push('');

  for (let i = 0; i < alternates.length; i++) {
    const alt = alternates[i];
    sections.push(`ALTERNATE SOURCE ${i + 1} [${alt.source.source.name}, ${alt.source.source.lang.toUpperCase()}, ${alt.bodyLength} chars]`);
    sections.push(`Title: ${alt.source.title}`);
    sections.push(`URL:   ${alt.source.link}`);
    if (alt.byline) sections.push(`Byline: ${alt.byline}`);
    sections.push('');
    sections.push('"""');
    sections.push(alt.fullText.slice(0, 3500));
    sections.push('"""');
    sections.push('');
  }

  const drafterBundle = sections.join('\n');

  // Build citation list for schema.org and the "Sources" footer block.
  const citationList = [
    { name: primary.source.source.name, url: primary.source.link },
    ...alternates.map((a) => ({ name: a.source.source.name, url: a.source.link })),
  ];

  return {
    topicKey: cluster.topicKey,
    primary,
    alternates,
    drafterBundle,
    citationList,
    asPrimaryResearch(): Research {
      return {
        source: primary.source,
        fullText: primary.fullText,
        byline: primary.byline,
        excerpt: primary.fullText.slice(0, 280),
        imageUrl: primary.imageUrl,
        language: primary.language,
      };
    },
  };
}
