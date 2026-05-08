import Parser from 'rss-parser';
import crypto from 'crypto';
import { SOURCES, type Source } from './sources';

export type FeedItem = {
  source: Source;
  title: string;
  link: string;
  contentSnippet: string;
  isoDate: string;
  hash: string;
};

const parser = new Parser({
  timeout: 12_000,
  headers: { 'User-Agent': 'TechPulsBot/1.0 (+https://techpuls.local)' },
});

function hash(s: string): string {
  return crypto.createHash('sha1').update(s.toLowerCase().replace(/[^a-z0-9]+/g, '')).digest('hex').slice(0, 16);
}

export async function fetchSource(source: Source): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const items: FeedItem[] = [];
    for (const item of feed.items.slice(0, 25)) {
      const title = (item.title ?? '').trim();
      const link = (item.link ?? '').trim();
      if (!title || !link) continue;
      items.push({
        source,
        title,
        link,
        contentSnippet: (item.contentSnippet ?? item.content ?? '').slice(0, 1200),
        isoDate: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
        hash: hash(title),
      });
    }
    return items;
  } catch (err) {
    console.warn(`[rss] ${source.name} fehlgeschlagen:`, (err as Error).message);
    return [];
  }
}

export async function fetchAllSources(): Promise<FeedItem[]> {
  const lists = await Promise.all(SOURCES.map(fetchSource));
  return lists.flat();
}

export function findTrending(items: FeedItem[]): Map<string, FeedItem[]> {
  const groups = new Map<string, FeedItem[]>();
  for (const item of items) {
    const list = groups.get(item.hash) ?? [];
    list.push(item);
    groups.set(item.hash, list);
  }
  return groups;
}
