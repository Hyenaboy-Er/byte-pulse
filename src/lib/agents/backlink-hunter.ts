// Backlink-Hunter agent — finds Reddit + Hacker News threads relevant to our
// recently-published topics. The OPERATOR posts the byte-pulse link in those
// threads (not the bot — that would get spam-banned). The agent's job is to
// SURFACE high-traffic threads worth replying to, with a Telegram alert.
//
// Runs every 4 hours, cooldown per thread-ID so we don't keep alerting on
// threads the operator already saw.
//
// Sources:
//   - Hacker News Algolia API (no auth) — searches by keyword across stories
//   - Reddit JSON endpoints (no auth) — searches r/technology, r/gadgets,
//     r/programming, r/artificial — top posts of the day matching keywords

import { prisma } from '../db';
import { tg } from '../telegram';

const COOLDOWN_MS = 7 * 24 * 3600 * 1000; // never re-alert same thread within 7 days

type Lead = {
  source: 'hn' | 'reddit';
  threadId: string;
  title: string;
  url: string;
  score: number;
  comments: number;
  matchedTag: string;
};

async function alreadyAlerted(threadId: string): Promise<boolean> {
  const r = await prisma.agentLog.findFirst({
    where: {
      agent: 'backlink-hunter',
      action: 'lead',
      message: { contains: threadId },
      createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) },
    },
  });
  return !!r;
}

async function searchHN(keyword: string): Promise<Lead[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=8&numericFilters=points>30,created_at_i>${Math.floor((Date.now() - 7 * 24 * 3600_000) / 1000)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as { hits?: Array<{ objectID: string; title: string; url: string; points: number; num_comments: number }> };
    return (data.hits ?? []).map((h) => ({
      source: 'hn' as const,
      threadId: `hn-${h.objectID}`,
      title: h.title ?? '',
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      score: h.points ?? 0,
      comments: h.num_comments ?? 0,
      matchedTag: keyword,
    }));
  } catch {
    return [];
  }
}

async function searchReddit(keyword: string): Promise<Lead[]> {
  try {
    const sub = 'technology+gadgets+programming+artificial+hardware';
    const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=hot&limit=8&t=week`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Byte-Pulse-Backlink-Hunter/1.0' },
    });
    if (!res.ok) return [];
    const data = await res.json() as { data?: { children?: Array<{ data: { id: string; title: string; permalink: string; ups: number; num_comments: number } }> } };
    return (data.data?.children ?? [])
      .filter((c) => (c.data.ups ?? 0) >= 50)
      .map((c) => ({
        source: 'reddit' as const,
        threadId: `r-${c.data.id}`,
        title: c.data.title,
        url: `https://www.reddit.com${c.data.permalink}`,
        score: c.data.ups,
        comments: c.data.num_comments,
        matchedTag: keyword,
      }));
  } catch {
    return [];
  }
}

export type BacklinkHunterReport = {
  keywordsScanned: number;
  candidates: number;
  freshLeads: number;
};

export async function runBacklinkHunter(): Promise<BacklinkHunterReport> {
  // Build keyword candidates from the most recent + most-viewed articles' tags
  const recentArticles = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
    orderBy: { views: 'desc' },
    take: 15,
    select: { title: true, tags: true },
  });

  // Extract candidate keywords: strong-noun pairs from the top articles
  const keywords = new Set<string>();
  for (const a of recentArticles) {
    // tags first (clean phrases)
    try {
      const tags = JSON.parse(a.tags) as string[];
      for (const t of tags.slice(0, 2)) {
        if (t.length >= 4) keywords.add(t.toLowerCase());
      }
    } catch {}
    // Plus first 2 capitalized words from the headline (likely the subject)
    const caps = a.title.match(/\b[A-Z][a-zA-Z0-9]{2,}\b/g)?.slice(0, 2) ?? [];
    for (const c of caps) keywords.add(c.toLowerCase());
  }
  const keywordList = Array.from(keywords).slice(0, 12); // cap to keep cron under 30s

  const allLeads: Lead[] = [];
  for (const kw of keywordList) {
    const [hn, rd] = await Promise.all([searchHN(kw), searchReddit(kw)]);
    allLeads.push(...hn, ...rd);
  }

  // Dedupe by thread-ID, take top by score
  const byId = new Map<string, Lead>();
  for (const l of allLeads) {
    const existing = byId.get(l.threadId);
    if (!existing || l.score > existing.score) byId.set(l.threadId, l);
  }
  const ranked = Array.from(byId.values()).sort((a, b) => b.score - a.score);

  // Filter against cooldown
  const fresh: Lead[] = [];
  for (const lead of ranked) {
    if (fresh.length >= 6) break;
    if (await alreadyAlerted(lead.threadId)) continue;
    fresh.push(lead);
    await prisma.agentLog.create({
      data: {
        agent: 'backlink-hunter',
        action: 'lead',
        status: 'info',
        message: lead.threadId,
        meta: JSON.stringify({ url: lead.url, score: lead.score, tag: lead.matchedTag }),
      },
    });
  }

  if (fresh.length) {
    const lines = [`🔗 Backlink-Hunter · ${fresh.length} relevante Threads`, ''];
    for (const l of fresh) {
      lines.push(`[${l.source.toUpperCase()} ${l.score}↑ ${l.comments}💬] ${l.title.slice(0, 100)}\n  Matched: "${l.matchedTag}"\n  ${l.url}`);
      lines.push('');
    }
    lines.push('Antworten manuell — Bot würde Spam-Ban kassieren. Tipp: 2-3 Sätze echte Meinung + Link am Ende.');
    await tg(lines.join('\n'));
  }

  await prisma.agentLog.create({
    data: {
      agent: 'backlink-hunter',
      action: 'run',
      status: 'success',
      message: `kw=${keywordList.length} candidates=${ranked.length} fresh=${fresh.length}`,
      meta: null,
    },
  });

  return {
    keywordsScanned: keywordList.length,
    candidates: ranked.length,
    freshLeads: fresh.length,
  };
}
