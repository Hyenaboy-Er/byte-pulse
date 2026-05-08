import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { FeedItem } from '../rss';

export type Research = {
  source: FeedItem;
  fullText: string;
  byline: string | null;
  excerpt: string;
  imageUrl: string | null;
  language: string | null;
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TechPulsBot/1.0';

export async function research(item: FeedItem): Promise<Research> {
  let html = '';
  try {
    const res = await fetch(item.link, {
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'de,en;q=0.8',
      },
      signal: AbortSignal.timeout(12_000),
      redirect: 'follow',
    });
    if (res.ok) html = await res.text();
  } catch {
    // fall through, use snippet only
  }

  let fullText = item.contentSnippet ?? '';
  let byline: string | null = null;
  let imageUrl: string | null = null;
  let language: string | null = null;

  if (html) {
    try {
      const dom = new JSDOM(html, { url: item.link });
      const doc = dom.window.document;

      // og:image
      const ogImg = doc.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[name="twitter:image:src"]');
      const rawImg = ogImg?.getAttribute('content')?.trim() ?? null;
      if (rawImg) {
        try { imageUrl = new URL(rawImg, item.link).toString(); } catch { imageUrl = null; }
      }

      language = doc.documentElement.getAttribute('lang') ?? null;

      const reader = new Readability(doc, { charThreshold: 200 });
      const parsed = reader.parse();
      if (parsed?.textContent) {
        fullText = parsed.textContent.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 8000);
      }
      byline = parsed?.byline ?? null;
    } catch {
      // ignore parser failures
    }
  }

  return {
    source: item,
    fullText: fullText || item.contentSnippet || item.title,
    byline,
    excerpt: (item.contentSnippet ?? '').slice(0, 400),
    imageUrl,
    language,
  };
}
