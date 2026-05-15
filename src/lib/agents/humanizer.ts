import { chat, MODELS, extractJson } from '../openai';
import type { WrittenArticle } from './writer';

// Typical AI tells in English prose. Used as instruction AND as a hard regex filter.
export const AI_PHRASES_EN = [
  'furthermore',
  'moreover',
  'additionally',
  'consequently',
  'nevertheless',
  'in conclusion',
  'in essence',
  "it's worth noting",
  "it's important to note",
  'it is important to note',
  'in today\'s fast-paced world',
  'in the realm of',
  'in the ever-evolving',
  'navigate the complexities',
  'delve into',
  'delving into',
  'tapestry',
  'stands as a testament',
  'speaks volumes',
  'leveraging',
  'paradigm shift',
  'game-changing',
  'cutting-edge',
  'state-of-the-art',
  'unleash',
  'unlock the potential',
  'a deep dive',
  'plays a crucial role',
  'plays a pivotal role',
  'cannot be overstated',
  'meticulous',
  'foster',
  'in the digital age',
  'embark on',
  'a multifaceted',
  'underscore',
  'ushering in',
];

// Kept for backwards-compatibility with existing imports.
export const AI_PHRASES_DE = AI_PHRASES_EN;

const SYSTEM = `You are a veteran tech journalist with 15 years at the desk. Your job: take an AI-written article and rewrite it so it reads like a real newsroom piece. Nobody should suspect AI was involved.

REMOVE rigorously (never leave in):
- "furthermore", "moreover", "additionally", "consequently"
- "in conclusion", "in essence", "it's worth/important to note"
- "in today's fast-paced world", "in the realm of", "in the ever-evolving"
- "delve into", "delving into", "tapestry", "stands as a testament"
- "leveraging", "paradigm shift", "game-changing", "cutting-edge"
- rigid "First / Second / Third" list structures
- exaggerated adjectives like "remarkable", "groundbreaking", "revolutionary" unless the facts back it up
- generic closing sentences that say nothing

REPLACE with:
- direct, short sentences. Mix sentence lengths heavily (3-word punches mixed with longer ones).
- occasional incomplete sentences for rhythm. Yes really.
- rhetorical questions where they fit
- concrete numbers/names instead of abstractions
- contractions (it's, that's, they're, you'll, won't)
- mild colloquial words ("pretty", "actually", "honestly", "kinda", "fair")
- the occasional sentence fragment. Sounds human.
- US-news cadence: punchy lead, build, payoff
- when something is uncertain, say so plainly ("we don't know yet", "Apple hasn't confirmed")

KEEP:
- every fact, number, name exactly
- the core thesis and structure
- the source attribution
- markdown formatting (## headings, **bold**, bullet lists)

LENGTH — THIS IS A HARD RULE, NOT A SUGGESTION:
- You are rewriting the VOICE, not summarising. The output MUST be within
  10% of the input's word count. If the draft is 1100 words, your rewrite
  is 1000-1200 words. NEVER shorter.
- Keep EVERY section, EVERY subheading, EVERY example, EVERY data point,
  EVERY paragraph. "Punchy" means varied sentence rhythm WITHIN the same
  amount of content — it does NOT mean cutting paragraphs or compressing
  the piece into a summary.
- If you find yourself deleting whole sentences of substance to sound
  punchy, you're doing it wrong. Rephrase them human, don't remove them.
- A short, tight 350-word rewrite of a 1100-word draft is a FAILURE even
  if it sounds great. Length parity is mandatory.

Reply with JSON only:
{
  "title": "...",
  "subtitle": "...",
  "excerpt": "...",
  "content": "...",
  "category": "...",
  "tags": ["..."],
  "changes": ["what you changed, max 5 short bullets"]
}`;

export type HumanizerResult = WrittenArticle & { changes: string[] };

function detectAiPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return AI_PHRASES_EN.filter((p) => lower.includes(p.toLowerCase()));
}

export async function humanize(draft: WrittenArticle): Promise<HumanizerResult> {
  const detected = [
    ...detectAiPhrases(draft.title),
    ...detectAiPhrases(draft.subtitle),
    ...detectAiPhrases(draft.content),
  ];

  const userPrompt = `Here's the draft. Make it human.
${detected.length ? `\n⚠️ These AI phrases MUST be removed: ${[...new Set(detected)].join(', ')}\n` : ''}

Draft as JSON:
${JSON.stringify({
  title: draft.title,
  subtitle: draft.subtitle,
  excerpt: draft.excerpt,
  content: draft.content,
  category: draft.category,
  tags: draft.tags,
}, null, 2)}`;

  const text = await chat({
    model: MODELS.humanizer,
    system: SYSTEM,
    user: userPrompt,
    // 6000 (was 4000): a 1300-word article is ~1700 content tokens, and
    // the model must re-emit the FULL JSON (title+subtitle+excerpt+content
    // +tags+changes) with escaping. 4000 truncated long pieces mid-content,
    // which the JSON parser then salvaged as a short article — a hidden
    // cause of the 360-word average. 6000 leaves headroom; still well
    // under the Vercel 60s budget for the humanizer step alone.
    maxTokens: 6000,
    json: true,
  });

  const parsed = extractJson<HumanizerResult>(text);
  if (!parsed) throw new Error(`Humanizer JSON parse failed: ${text.slice(0, 300)}`);

  parsed.category = draft.category;
  parsed.tags = parsed.tags?.length ? parsed.tags : draft.tags;
  parsed.changes = parsed.changes ?? [];

  // GUARDRAIL: if the humanizer over-compressed (it loves to, despite the
  // prompt), keep the writer's longer draft body instead of shipping a
  // gutted 350-word version. Voice < length. The reviewer still runs after
  // this and catches AI-smell on the draft if the humanizer truly failed.
  const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  const draftWords = wc(draft.content);
  const humanWords = wc(parsed.content ?? '');
  if (draftWords >= 400 && humanWords < draftWords * 0.7) {
    parsed.content = draft.content;
    parsed.changes = [
      ...(parsed.changes ?? []),
      `length-guard: humanizer cut ${draftWords}→${humanWords} words; reverted to draft body`,
    ];
  }

  return parsed;
}
