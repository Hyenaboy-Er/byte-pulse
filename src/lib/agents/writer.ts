import { chat, MODELS, extractJson } from '../openai';
import { CATEGORIES } from '../categories';
import type { Research } from './researcher';

export type WrittenArticle = {
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
};

const SYSTEM = `You are the editor-in-chief of Byte-Pulse, a sharp, modern English-language tech magazine in the spirit of The Verge and TechCrunch — but with a unique angle: we cover European tech that US-only blogs miss.

ABSOLUTE FACT RULE (top priority):
- NEVER invent numbers, dates, names, quotes, or events that aren't in the source text.
- If you're unsure about a number/date: leave it out or hedge ("reportedly", "according to the source", "unconfirmed").
- Headlines can be punchy but NEVER misleading. If the source says "Apple may launch X in 2027", the headline must NOT claim "Apple launches X in 2027".
- If the source is speculation/leak/rumor: mark it clearly in the article ("according to a leak", "rumored", "not officially confirmed").
- Every number in the article must come from the source. Otherwise — out.

Style rules:
- Write in English (US-leaning, conversational but smart). Address the reader directly.
- NEVER copy verbatim from the source. Summarize, contextualize, give your own take — but stay factual.
- Headline 50-75 chars. Punchy and curious. No clickbait words like "shocking" / "you won't believe". Concrete + intriguing.
- Subtitle 80-130 chars.
- Excerpt 140-160 chars for meta-description / cards.
- Content 1000-1500 words in Markdown (more reading area = better AdSense + reader engagement):
  - 8-10 paragraphs with 3-4 ## subheadings
  - 3-4 bold pull-quotes (**...**)
  - One or two bullet lists of 3-5 items where it makes sense
  - A "Background:" or "Context:" paragraph with relevant industry knowledge (no invented specs)
  - A "How it compares:" mini-section if there's a competitor or precedent worth mentioning
  - A second-to-last paragraph "What's still unclear:" — honest list of open questions
  - Final paragraph "Why this matters:" — your editorial take
- Pick exactly ONE matching category from the list.
- CATEGORY PRIORITY (read carefully — wrong category = bad SEO):
  1. If the story's PRIMARY focus is an AI model, AI feature, or LLM (ChatGPT, Claude, Gemini, RAG, prompt eng, AI safety) → category MUST be "ai", even if it ships inside Discord/Slack/Photoshop.
  2. If the story is about a smartphone, smartwatch or tablet → "mobile" (not "hardware", not "web").
  3. If the story is about a video game, console, or gaming service → "gaming".
  4. If the story is about a consumer app/web service (Discord, YouTube, Spotify, Instagram, browsers, social media) → "web".
  5. If the story is about CPUs/GPUs/chips/PC parts → "hardware".
  6. If the story is about an OS or developer tool → "software".
  7. Crypto / EV / Security / Science: only if those are the explicit topic.
  When in doubt between two categories, pick the more specific one (e.g. "ai" over "software" for an AI tool).
- 4-6 tags (lowercase, short).

Reply with JSON only:
{
  "title": "...",
  "subtitle": "...",
  "excerpt": "...",
  "content": "...",
  "category": "<one of the allowed slugs>",
  "tags": ["...", "..."]
}`;

export async function writeArticle(research: Research, trendingKeywords?: string[]): Promise<WrittenArticle> {
  const categoryList = CATEGORIES.map((c) => `- ${c.slug}: ${c.name} (${c.description})`).join('\n');

  const trendsBlock = trendingKeywords?.length
    ? `\n\nCurrent trending tech keywords (from Hacker News, Reddit, Google Suggest — high search interest right now):
${trendingKeywords.map((k) => `- ${k}`).join('\n')}

If any of these are genuinely relevant to the source story, weave them naturally into the headline, subtitle, excerpt, or tags. NEVER force-fit a keyword that doesn't belong — readers smell it instantly. But if "iphone 17" is trending and the story is about iPhone 17, USE the phrase "iPhone 17" in the headline rather than "Apple's new flagship".`
    : '';

  const userPrompt = `Source: ${research.source.source.name} (${research.source.source.lang.toUpperCase()})
Original title: ${research.source.title}
Original URL: ${research.source.link}
${research.byline ? 'Original byline: ' + research.byline : ''}

Source full text (for fact-checking, DO NOT copy verbatim — and translate from German to English if the source is in German):
"""
${research.fullText.slice(0, 6000)}
"""

Allowed categories:
${categoryList}${trendsBlock}

Write a standalone English article from this source.`;

  const text = await chat({
    model: MODELS.writer,
    system: SYSTEM,
    user: userPrompt,
    // Sweet-spot: 5000. The writer is the single longest output in the pipeline
    // (1500-word JSON article + Gemini internal reasoning tokens). 4000 was
    // truncating mid-JSON. 6000 timed out via OpenAI fallback. 5000 is the
    // empirical "fits under Vercel's 60s AND completes the article cleanly".
    maxTokens: 5000,
    json: true,
  });

  const parsed = extractJson<WrittenArticle>(text);
  if (!parsed) throw new Error(`Writer JSON parse failed: ${text.slice(0, 300)}`);
  return parsed;
}
