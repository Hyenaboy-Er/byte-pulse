// Content-Refresher agent — finds older articles that still attract traffic
// and refreshes them: appends a short "Update <date>:" paragraph with new
// context and bumps publishedAt so Google sees the article as recent. Does
// NOT change the slug or content above the update — that would break URL
// canonicalization and look manipulative to Google.
//
// Selection criteria (BOTH must apply):
//   - Published 7-60 days ago (sweet spot: old enough to be "stale", new
//     enough that an update is plausible)
//   - Has at least N views (we don't refresh ghost articles, Google would
//     interpret the bump as keyword stuffing)
//
// Refresh strategy:
//   - Fetch the article body
//   - Ask LLM (writer model) for a 60-120 word "Update" paragraph in the
//     article's voice, mentioning what's changed since the original (it
//     either knows because of training data, or we say "no major change,
//     here's renewed context"). NEVER invent facts.
//   - Append "## Update <date>" + paragraph to article.content
//   - Update publishedAt to NOW, set updatedAt automatically by Prisma
//   - Ping IndexNow so Bing re-indexes
//
// Limit to 3 articles per run to keep LLM costs predictable.

import { prisma } from '../db';
import { llmChat, extractJson } from '../llm';
import { pingIndexNow } from '../indexnow';
import { SITE } from '../site';

const SITE_URL = SITE.url;

const SYSTEM = `You write short follow-up "Update" paragraphs for tech-news articles published earlier.
The article was published <X> days ago. Add ONE paragraph (60-120 words) describing what's developed since then.

Hard rules:
- NEVER invent facts. If you don't know what's changed, write a paragraph contextualizing why the original story still matters (don't fake "Update: Apple released X" if you don't actually know that happened).
- Keep the tone identical to the original (conversational, smart, factual).
- Plain prose, no Markdown decorations beyond inline bolding.
- Don't repeat what the original article said — add NEW perspective only.

Reply with JSON: { "update_paragraph": "<the paragraph>" }`;

export type ContentRefresherReport = {
  candidates: number;
  refreshed: number;
  slugs: string[];
};

export async function runContentRefresher(opts?: { maxPerRun?: number; minViews?: number }): Promise<ContentRefresherReport> {
  const maxPerRun = Math.max(1, Math.min(10, opts?.maxPerRun ?? 3));
  const minViews = Math.max(0, opts?.minViews ?? 30);

  const articles = await prisma.article.findMany({
    where: {
      status: 'published',
      publishedAt: {
        gte: new Date(Date.now() - 60 * 24 * 3600 * 1000),
        lte: new Date(Date.now() - 7 * 24 * 3600 * 1000),
      },
      views: { gte: minViews },
      // Skip articles we already refreshed (look for our update marker)
      NOT: { content: { contains: '## Update — ' } },
    },
    orderBy: { views: 'desc' },
    take: maxPerRun,
    select: { id: true, slug: true, title: true, excerpt: true, content: true, publishedAt: true },
  });

  const refreshed: string[] = [];
  for (const a of articles) {
    const ageDays = a.publishedAt ? Math.round((Date.now() - a.publishedAt.getTime()) / (24 * 3600_000)) : 0;
    const userPrompt = `Article title: ${a.title}
Published ${ageDays} days ago.
Original excerpt: ${a.excerpt}

Original opening (first 600 chars):
"""
${a.content.slice(0, 600)}
"""

Write the update paragraph.`;

    let text = '';
    try {
      text = await llmChat({
        role: 'humanizer',
        system: SYSTEM,
        user: userPrompt,
        maxTokens: 600,
        json: true,
        temperature: 0.5,
      });
    } catch {
      continue;
    }
    const parsed = extractJson<{ update_paragraph?: string }>(text);
    const paragraph = parsed?.update_paragraph?.trim();
    if (!paragraph || paragraph.length < 80) continue;

    const today = new Date().toISOString().slice(0, 10);
    const newContent = `${a.content}\n\n## Update — ${today}\n\n${paragraph}\n`;

    await prisma.article.update({
      where: { id: a.id },
      data: { content: newContent, publishedAt: new Date() },
    });

    // Re-ping IndexNow so Bing re-crawls with the new content/date
    pingIndexNow([`${SITE_URL}/article/${a.slug}`]).catch(() => null);

    refreshed.push(a.slug);
  }

  await prisma.agentLog.create({
    data: {
      agent: 'content-refresher',
      action: 'run',
      status: 'success',
      message: `candidates=${articles.length} refreshed=${refreshed.length}`,
      meta: JSON.stringify({ slugs: refreshed }),
    },
  });

  return { candidates: articles.length, refreshed: refreshed.length, slugs: refreshed };
}
