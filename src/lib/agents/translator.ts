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

  const text = await chat({
    model: MODELS.writer,
    system: SYSTEM_DE,
    user: userPrompt,
    maxTokens: 4000,
    json: true,
  });

  const parsed = extractJson<Translation>(text);
  if (!parsed) throw new Error(`Translator JSON parse failed: ${text.slice(0, 200)}`);

  // Inject .de Amazon affiliate links into the German content (separate tag from EN).
  const { content: monetizedContent } = injectAmazonLinks(parsed.content, 'de');
  parsed.content = monetizedContent;

  // 4. Cache
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

  return parsed;
}

function safeParseTags(s: string): string[] {
  try { return JSON.parse(s); } catch { return []; }
}
