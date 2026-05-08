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
    maxTokens: 3000,
    json: true,
  });

  const parsed = extractJson<HumanizerResult>(text);
  if (!parsed) throw new Error(`Humanizer JSON parse failed: ${text.slice(0, 300)}`);

  parsed.category = draft.category;
  parsed.tags = parsed.tags?.length ? parsed.tags : draft.tags;
  parsed.changes = parsed.changes ?? [];
  return parsed;
}
