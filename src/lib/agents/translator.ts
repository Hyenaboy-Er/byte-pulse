// Translator Agent
// Translates a published English article into a target language (DE for now).
// Cached in DB — only calls OpenAI on first request, instant on every subsequent visit.
// Quality: GPT-4o handles idioms, headlines, German tone — much better than Google Translate.

import { prisma } from '../db';
import { chat, MODELS, extractJson } from '../openai';
import { injectAmazonLinks } from '../affiliate';

export type Translation = {
  title: string;
  subtitle: string | null;
  excerpt: string;
  content: string;
  tags: string[];
};

const SYSTEM_DE = `You translate English tech-magazine articles into German for Byte-Pulse readers. You are NOT a literal translator — you are a German tech editor rewriting for a German audience.

Rules:
- Output German that reads natively, not translated. Use Du-form, conversational, smart.
- Adapt idioms instead of literal translation ("at the end of the day" → "letzten Endes" oder weglassen, nicht "am Ende des Tages" wörtlich).
- Keep all proper nouns (product names, company names, people) in original spelling.
- Keep technical terms that are widely used in German English (Smartphone, KI, Browser, Streaming) — don't over-translate.
- Adapt the headline to German clickbait style: punchy, curious, 50-75 chars. NOT word-for-word.
- Keep markdown structure exactly (## headings, **bold**, bullets, blockquotes).
- Translate tags to short German keywords (lowercase).
- Preserve all numbers, dates, names exactly.

Reply with JSON only:
{
  "title": "...",
  "subtitle": "...",
  "excerpt": "...",
  "content": "...",
  "tags": ["...", "..."]
}`;

export async function translateArticle(articleId: string, lang: 'de' = 'de'): Promise<Translation | null> {
  // 1. Cache hit?
  const cached = await prisma.translation.findUnique({ where: { articleId_lang: { articleId, lang } } });
  if (cached) {
    return {
      title: cached.title,
      subtitle: cached.subtitle,
      excerpt: cached.excerpt,
      content: cached.content,
      tags: safeParseTags(cached.tags),
    };
  }

  // 2. Fetch article
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article || article.status !== 'published') return null;

  // 3. Translate via OpenAI
  const userPrompt = `Title: ${article.title}
Subtitle: ${article.subtitle ?? ''}
Excerpt: ${article.excerpt}
Tags: ${article.tags}

Content:
"""
${article.content}
"""

Translate to German per the rules.`;

  // QUALITY GATE — the bug this fixes: maxTokens was 4000, which silently
  // TRUNCATES the German translation of long articles mid-sentence, and the
  // broken result was cached forever with zero validation. Now: generous
  // token budget + a length-ratio check + one stricter retry, and we only
  // ever CACHE a translation that passes the gate (a bad one is returned
  // best-effort so the page still renders, but not persisted — so it
  // self-heals on the next request / via the translation-repair pass).
  const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  const srcWords = wc(article.content);
  // German runs ~0.9–1.15× the English word count. A complete translation
  // is virtually never below 0.7×; far below = truncated/summarised.
  const MIN_RATIO = 0.7;

  async function translateOnce(strict: boolean): Promise<Translation | null> {
    const text = await chat({
      model: MODELS.writer,
      system: strict
        ? SYSTEM_DE +
          '\n\nCRITICAL: Translate the ENTIRE article to the very last sentence. Do NOT stop early, summarise, or drop sections. The German content must cover every paragraph and heading of the source.'
        : SYSTEM_DE,
      user: userPrompt,
      maxTokens: 8000, // was 4000 — too low; truncated long articles
      json: true,
    });
    return extractJson<Translation>(text);
  }

  let parsed = await translateOnce(false);
  let ratio = parsed?.content ? wc(parsed.content) / Math.max(1, srcWords) : 0;

  // Retry once, stricter, if the first pass came back short (truncated).
  if (!parsed || ratio < MIN_RATIO) {
    const retry = await translateOnce(true);
    const retryRatio = retry?.content ? wc(retry.content) / Math.max(1, srcWords) : 0;
    if (retry && retryRatio > ratio) {
      parsed = retry;
      ratio = retryRatio;
    }
  }

  if (!parsed) throw new Error('Translator JSON parse failed after retry');

  // Inject .de Amazon affiliate links into the German content (separate tag from EN).
  const { content: monetizedContent } = injectAmazonLinks(parsed.content, 'de');
  parsed.content = monetizedContent;

  // 4. Cache ONLY if it passed the quality gate. A still-truncated result
  //    is returned (page renders something) but never persisted, so it is
  //    re-attempted next time instead of being frozen broken forever.
  if (ratio >= MIN_RATIO) {
    await prisma.translation.create({
      data: {
        articleId,
        lang,
        title: parsed.title,
        subtitle: parsed.subtitle ?? null,
        excerpt: parsed.excerpt,
        content: parsed.content,
        tags: JSON.stringify(parsed.tags ?? []),
      },
    }).catch(() => null); // ignore race conditions
  } else {
    console.warn(`[translator] ${articleId}: ratio ${ratio.toFixed(2)} < ${MIN_RATIO} after retry — NOT cached (will re-attempt)`);
  }

  return parsed;
}

function safeParseTags(s: string): string[] {
  try { return JSON.parse(s); } catch { return []; }
}
