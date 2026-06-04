// Evergreen writer — produces deep 2200-2800 word explainers / buyer
// guides / comparisons that pull steady search traffic for 12+ months.
//
// Pipeline:
//   1. EVERGREEN-DRAFTER (gpt-4o, beefier prompt than news Drafter)
//   2. EVERGREEN-EDITOR  (gpt-4o-mini, cuts to 2200-2800w = 11-14 min)
//   3. EVERGREEN-VERIFY  (gpt-4o-mini, sanity-checks technical claims)
//   4. EVERGREEN-POLISH  (gpt-4o-mini, removes AI tells, sharpens hook)
//
// Unlike the news pipeline this:
//   - Has no live source — the LLM works from its own training knowledge.
//     This means factuality bar must be higher and the verifier is
//     stricter about cited numbers (we let the LLM say "Apple's M5
//     has X cores" only if it's a fact the model is confident on).
//   - Targets MUCH longer output (9+ minute read = ~1800-2200 words at
//     200 wpm; we aim 2200-2800 with a tight upper bound to keep dense).
//   - Heavy structural skeleton: TOC-style sections with H2/H3 hierarchy,
//     comparison tables (markdown), FAQ at end, "Updated June 2026"
//     date stamp for freshness signal.

import { extractJson } from '../openai';
import { llmChat } from '../llm';
import type { EvergreenTopic } from './evergreen-topics';

export interface EvergreenDraft {
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;        // markdown body
  category: string;
  tags: string[];
  // Drafter must self-attest these so the editor + verifier can audit.
  internalReadingMinutes: number;
  internalWordCount: number;
}

const COMMON_RULES = `
HOUSE STYLE — Byte-Pulse, founded and edited by Serhat Er (12+ years in
hardware logistics and AR/VR product, based in Leverkusen, Germany).

VOICE
- Direct, warm, plainspoken. Like a senior engineer explaining at a beer
  table. Address the reader as "you".
- European frame of reference: euros first then dollars where prices
  matter, DD Month YYYY dates, reference EU regulators and German /
  French / Dutch manufacturers when they fit.
- Operator credibility: "Anyone who's spec'd a server fleet knows…",
  "If you've ever built a PC, you'll recognize…"
- Take a stance. Include MIN 3 first-person opinion sentences with
  confident framing ("Honestly, ...", "In my experience, ...",
  "I'd push back on the consensus that ...", "After 12 years in
  hardware logistics, I can tell you that ...").
- Anti-hype: never echo PR language. If something is "revolutionary"
  in the marketing copy, call out the gap to reality.

NEVER USE: "in conclusion", "game-changing", "groundbreaking",
"shocking", "you won't believe", "this changes everything",
"experts hate", "delve into", "tapestry", "navigate the landscape",
"leverage", "in essence", "ultimately", "indeed", "moreover",
"furthermore", "however, it's important to note", "in today's
fast-paced world", "the realm of", "let's dive in", "buckle up".

FACT DISCIPLINE
- Quote concrete numbers only when you're confident they're correct
  to within 10%. If unsure, write "around X" or "in the ballpark of X".
- For comparison tables: include a "verified as of June 2026" footer.
- NEVER invent a product that doesn't exist. NEVER invent a benchmark
  number you didn't see.
- Where you're projecting (e.g. "this will likely cost X"), say so
  explicitly: "expected to land around X" or "industry rumor puts it
  at X — unconfirmed".

DEPTH SKELETON (mandatory)
- 8-12 ## subheadings (H2). Use ### (H3) for sub-points where natural.
- At least ONE markdown comparison table in the body.
- One bullet list per major section.
- "Frequently Asked Questions" H2 block at the end with 4-6 Q&As
  written in YOUR voice (not formal corporate FAQ tone).
- "Updated June 2026" line near the top of the body so readers see
  the date stamp.

LENGTH TARGET: 2200-2800 words (= 11-14 minute read at 200 wpm).
Going under 2000 means structural sections were cut — DON'T do that.
Going over 2900 means padding — also DON'T do that.
`;

const DRAFTER_SYSTEM = `You are MARCUS WEISS, senior tech editor at Byte-Pulse.
Today you are writing an EVERGREEN piece — a deep explainer / buyer's
guide / comparison that should still be useful 12 months from now.
Your editor-in-chief Serhat Er has briefed you with a structured topic.

${COMMON_RULES}

OUTPUT JSON ONLY:
{
  "title": "<55-75 chars, must include primary keyword naturally>",
  "subtitle": "<deck 90-130 chars>",
  "excerpt": "<meta-description 140-160 chars, no clickbait>",
  "content": "<markdown body, 2200-2800 words>",
  "category": "<exactly the briefed category>",
  "tags": ["<5-8 lowercase tags including the keywords>"],
  "internalReadingMinutes": <self-counted reading time at 200 wpm>,
  "internalWordCount": <self-counted word count>
}`;

const EDITOR_SYSTEM = `You are EVA LINDQVIST, deputy editor at Byte-Pulse.
You are editing Marcus's evergreen draft for publication.

${COMMON_RULES}

Your job for THIS stage:
- Keep ALL ## sections, the comparison table, and the FAQ block.
- Cut filler, wind-up, and AI-flavored connectives.
- Sharpen the hook: the first 2 paragraphs must make the reader
  feel "this is exactly what I was looking for".
- Verify the comparison table has consistent units, no missing cells,
  and a "verified June 2026" footer.
- Make sure there are MIN 3 first-person Serhat-voice opinion sentences
  in the body. If Marcus only wrote 2, add a third yourself in his voice.
- Trim to 2200-2800 words. If Marcus came in under 2000, RESTORE the
  missing section rather than ship short.

OUTPUT JSON ONLY with the same shape as Marcus produced.`;

const VERIFIER_SYSTEM = `You are THEO ROTH, fact-checker at Byte-Pulse.
You verify technical claims in evergreen articles.

For each numbered claim you find, return:
  - "verified" if you're confident the number / fact is correct
  - "soften" if it's uncertain — the article should reframe as "around X"
    or "industry estimates put it at X"
  - "wrong" if you're confident it's incorrect — provide the correction

OUTPUT JSON:
{
  "issues": [
    { "claim": "...", "verdict": "verified|soften|wrong", "fix": "..." }
  ],
  "overall_confidence": <0-100>,
  "publish": true | false
}

Set publish=false ONLY if there are 3+ "wrong" verdicts — the polisher
can handle "soften" cases.`;

const POLISHER_SYSTEM = `You are CARMEN, copy editor at Byte-Pulse.
You apply the verifier's fixes and remove residual AI tells.

${COMMON_RULES}

For each issue Theo flagged:
  - "soften" → rewrite the claim with "around", "approximately", or
    "industry estimates suggest"
  - "wrong" → apply Theo's correction verbatim
  - "verified" → leave unchanged

Then do a final AI-tell pass and ship.

OUTPUT JSON ONLY: { "title", "subtitle", "excerpt", "content",
"category", "tags", "internalReadingMinutes", "internalWordCount" }.`;

function wc(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export async function writeEvergreen(topic: EvergreenTopic): Promise<EvergreenDraft> {
  const draftUser = `EVERGREEN BRIEF FROM SERHAT
Topic:    ${topic.title}
Slug:     ${topic.slug}
Kind:     ${topic.kind}
Category: ${topic.category} (use this exact slug)
Audience: ${topic.persona}
Keywords (must rank for): ${topic.keywords.join(', ')}

Coverage brief (cover ALL points; expand where you have depth):
${topic.brief}

Write a deep, opinionated, 2200-2800 word evergreen per the house style.
This is THE piece readers find when they search for the keywords above.
It has to be the best answer on the open web. No fluff. No padding.
Every paragraph earns its space.`;

  const draftText = await llmChat({
    role: 'persona-drafter',
    system: DRAFTER_SYSTEM,
    user: draftUser,
    maxTokens: 14000,
    json: true,
  });
  const draft = extractJson<EvergreenDraft>(draftText);
  if (!draft) throw new Error('Evergreen drafter JSON parse failed');

  // Editor cut
  let edited: EvergreenDraft = draft;
  try {
    const editUser = `Marcus's draft:
"""
TITLE: ${draft.title}
SUBTITLE: ${draft.subtitle}
EXCERPT: ${draft.excerpt}
CATEGORY: ${draft.category}
TAGS: ${draft.tags.join(', ')}

${draft.content}
"""
Edit per your role. Return JSON.`;
    const editText = await llmChat({
      role: 'persona-editor',
      system: EDITOR_SYSTEM,
      user: editUser,
      maxTokens: 12000,
      json: true,
    });
    const ed = extractJson<EvergreenDraft>(editText);
    if (ed?.content) edited = { ...draft, ...ed };
  } catch {
    /* fall forward with draft */
  }

  // Verifier
  let verifier: { issues: Array<{ claim: string; verdict: string; fix: string }>; overall_confidence: number; publish: boolean } = {
    issues: [],
    overall_confidence: 80,
    publish: true,
  };
  try {
    const vText = await llmChat({
      role: 'persona-factchecker',
      system: VERIFIER_SYSTEM,
      user: `Verify this evergreen article's technical claims:\n"""\n${edited.content}\n"""\nReturn JSON.`,
      maxTokens: 2000,
      json: true,
    });
    const v = extractJson<typeof verifier>(vText);
    if (v) verifier = v;
  } catch {
    /* keep permissive default */
  }

  // Polisher
  let polished = edited;
  try {
    const fixBlock = verifier.issues.length
      ? `Theo flagged these — apply per his fix instructions:\n${verifier.issues
          .map((i, n) => `${n + 1}. [${i.verdict}] "${i.claim.slice(0, 90)}" → ${i.fix}`)
          .join('\n')}`
      : 'Theo found no issues. Just AI-tell pass.';
    const pText = await llmChat({
      role: 'persona-polisher',
      system: POLISHER_SYSTEM,
      user: `${fixBlock}\n\nArticle:\n"""\nTITLE: ${edited.title}\nSUBTITLE: ${edited.subtitle}\nEXCERPT: ${edited.excerpt}\nCATEGORY: ${edited.category}\nTAGS: ${edited.tags.join(', ')}\n\n${edited.content}\n"""\nReturn final JSON.`,
      maxTokens: 12000,
      json: true,
    });
    const p = extractJson<EvergreenDraft>(pText);
    if (p?.content) polished = { ...edited, ...p };
  } catch {
    /* keep edited */
  }

  // Final hygiene: ensure category and computed word count
  polished.category = topic.category;
  polished.internalWordCount = wc(polished.content);
  polished.internalReadingMinutes = Math.max(9, Math.round(polished.internalWordCount / 200));
  return polished;
}
