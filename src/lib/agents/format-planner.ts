// Format Planner — selects ONE of 10 distinct structural templates per
// article BEFORE the Drafter writes. Solves the "same skeleton, different
// topic" pattern that even a multi-source pipeline produces if every story
// uses the same Facts-All-Confirm / Contrasting-Claims / Focus-Shift /
// What's-Missing / Compared-to / What-This-Means / Why-This-Matters
// scaffold.
//
// WHY (Serhat 2026-06-04): structural sameness is the last remaining
// pattern-recognition signal a reviewer (or HCU classifier) can catch.
// Quality is high; what's left to fix is FORMAT VARIANCE per article.
//
// HOW
//   1. Look at the multi-source bundle: which outlets cover this story,
//      do they agree, what's the dominant angle, is it breaking news or
//      analysis, etc.
//   2. Pick 1 of 10 formats (rotated by what fits the story, NOT random).
//   3. Generate the CUSTOM H2 section headings for THIS story under that
//      format. Each story gets unique headings — never the same template
//      twice.
//   4. Return { formatId, customHeadings, formatGuidance }. The Drafter
//      receives these and writes within the chosen structure.

import { chat, MODELS, extractJson } from '../openai';
import type { MultiSourceBundle } from './multi-source-researcher';

export type FormatId =
  | 'investigation'      // What they're not telling you
  | 'classic-analysis'   // Standard news-analysis (use sparingly)
  | 'contrast'           // A vs B head-to-head
  | 'timeline'           // How we got here
  | 'operator-pov'       // Inside-the-industry view
  | 'listicle-deep'      // "N things that actually matter"
  | 'explainer-pivot'    // Concept first, news second
  | 'first-person-take'  // Lead with opinion
  | 'lessons-from'       // What this teaches us
  | 'case-study';        // Deep zoom on one angle

export interface FormatChoice {
  formatId: FormatId;
  /** Why this format fits THIS story — one sentence, for logging */
  rationale: string;
  /** Section headings the Drafter will use as H2s, in order.
   *  3-7 entries. CUSTOM to this story, NOT generic template phrases. */
  customHeadings: string[];
  /** Per-format writing guidance the Drafter must follow. */
  formatGuidance: string;
}

/**
 * Catalog of available formats. Each has a one-line "when to use" criterion
 * the planner uses to decide. Headings are SHAPES, not literal headings —
 * the planner customizes them per story.
 */
const FORMAT_CATALOG: Record<FormatId, { criterion: string; shape: string }> = {
  investigation: {
    criterion: 'Outlets contradict each other materially OR the official line feels suspect',
    shape: 'Open with what doesn\'t add up, then dig: official position → contradicting evidence → uncovered angle → operator\'s read',
  },
  'classic-analysis': {
    criterion: 'Pure straightforward news where outlets largely agree (use sparingly — variance is the goal)',
    shape: 'Lead → consensus facts → analysis → implications → outlook',
  },
  contrast: {
    criterion: 'Two clear sides / two products / two companies / two policy approaches in tension',
    shape: 'Side A position → Side B position → where they actually disagree → who wins this round → downstream effect',
  },
  timeline: {
    criterion: 'The story makes most sense told as a sequence — months of context lead to this moment',
    shape: 'How we got here → the trigger → today\'s news in context → next move → operator\'s read on timing',
  },
  'operator-pov': {
    criterion: 'There is a clear "what the industry hears vs what the press release says" angle',
    shape: 'Press-release reading → what an operator hears → the signal nobody covers → what I\'d do in this seat',
  },
  'listicle-deep': {
    criterion: 'Multiple distinct angles each worth their own substantive section — natural list structure',
    shape: 'N distinct things, each with its own analytical add (not bullet-list — full paragraph sections)',
  },
  'explainer-pivot': {
    criterion: 'Story relies on an underlying technology / concept most readers don\'t fully understand',
    shape: 'Why this category matters → the tech in plain language → the actual news → what changes → what to watch',
  },
  'first-person-take': {
    criterion: 'Story has clear stakes where Byte-Pulse\'s editorial position adds value — operator op-ed style',
    shape: 'Lead with stance ("Here\'s what I think...") → the facts → why I\'m calling it that → where I could be wrong → what I\'d do',
  },
  'lessons-from': {
    criterion: 'This is part of a broader industry pattern worth surfacing',
    shape: 'The news → the pattern → where we\'ve seen this before → industry lesson → buyer\'s lesson',
  },
  'case-study': {
    criterion: 'One specific angle or stakeholder deserves a deep zoom rather than a broad survey',
    shape: 'The chosen angle → the data → the implication → what other outlets missed → why this angle matters',
  },
};

/** System prompt for the planner — pure routing decision, returns JSON. */
const PLANNER_SYSTEM = `You are the FORMAT PLANNER for Byte-Pulse.

Every article produced by our newsroom system has so far used the same
skeleton: Facts All Sources Confirm / Contrasting Claims / Focus Shift /
What's Missing / Compared to / What This Means for You / Why This Matters.

That sameness is the last remaining pattern-recognition signal that an
AdSense reviewer (or Google's Helpful Content classifier) can catch:
"gleiches Gehirn, gleiche Struktur, anderes Thema". You exist to break
that pattern.

Your job: read the multi-source bundle below and pick the ONE format that
ACTUALLY FITS THIS STORY. Then generate custom H2 section headings tailored
to this specific topic — not generic template phrases.

Available formats:
${Object.entries(FORMAT_CATALOG)
  .map(([id, f]) => `  • ${id} — use when: ${f.criterion}\n      Shape: ${f.shape}`)
  .join('\n\n')}

Selection rules:
  1. Pick the format that BEST matches the story's intrinsic shape.
     A leak with conflicting source claims = investigation.
     A product launch facing a clear rival = contrast.
     A regulator-driven story = timeline.
     A pure spec announcement = explainer-pivot.
     A roadmap / company strategy story = operator-pov.
     Multiple discrete angles each worth a section = listicle-deep.
  2. **NEVER pick "classic-analysis"**. It's a sentinel — its presence in
     our output means the planner failed. Every real story fits into one
     of the other 9 formats; if you find yourself reaching for classic,
     re-read the catalog and pick the next-best fit (usually
     operator-pov, case-study, or listicle-deep is the right escape).
  3. Generate 4-6 H2 headings that are SPECIFIC to this story (not
     "Facts All Sources Confirm" — instead "Why a 2026 launch date makes
     no sense" or "How Snapdragon's silence here is revealing").
  4. Headings must sound like a human editor wrote them — declarative,
     specific, with a verb and a noun the reader recognizes. Not titlecase
     stock phrases.
  5. Headings must NEVER include the phrases: "Facts All Sources
     Confirm", "Contrasting Claims", "Focus Shift", "Compared to",
     "What This Means for You", "Why This Matters", "What's Still
     Unclear" — these are the legacy skeleton we are escaping. Use
     story-specific phrasings instead.

OUTPUT JSON ONLY:
{
  "formatId": "<one of the 10 IDs>",
  "rationale": "<one sentence on why this fits>",
  "customHeadings": ["<heading 1>", "<heading 2>", "<heading 3>", "<heading 4>", "<heading 5>"],
  "formatGuidance": "<2-3 sentences telling the Drafter how to handle this format specifically for this story>"
}`;

/**
 * Plan the structural format for an article BEFORE the Drafter writes.
 * Always returns a valid FormatChoice — falls back to classic-analysis
 * with sensible defaults if the planner LLM call fails.
 */
export async function planFormat(bundle: MultiSourceBundle): Promise<FormatChoice> {
  const outletList = [bundle.primary, ...bundle.alternates]
    .map((t) => `${t.source.source.name} (${t.source.source.lang.toUpperCase()})`)
    .join(', ');

  // Compact bundle snippet for the planner. Don't send full bodies — we
  // only need enough to judge the story's shape.
  const briefBundle = bundle.drafterBundle.slice(0, 3500);

  const userPrompt = `MULTI-SOURCE BUNDLE — topic: "${bundle.topicKey}"
Outlets reporting: ${outletList}

${briefBundle}

Pick the best format and generate custom headings for this specific story.`;

  try {
    const text = await chat({
      model: MODELS.reviewer, // gpt-4o-mini routing decision — fast + cheap
      system: PLANNER_SYSTEM,
      user: userPrompt,
      maxTokens: 1200,
      json: true,
    });
    const parsed = extractJson<FormatChoice>(text);
    if (parsed && isValidFormat(parsed)) return parsed;
  } catch {
    /* fall through to default */
  }

  // Safe fallback — operator-pov with generic-but-not-skeleton headings.
  // We do NOT fall back to classic-analysis because that brings the
  // Facts-All-Confirm template back. operator-pov is the broadest
  // non-skeleton format.
  return {
    formatId: 'operator-pov',
    rationale: 'Planner unavailable — defaulted to operator-pov',
    customHeadings: [
      'What the announcement actually says',
      'What an operator hears in this',
      'The signal nobody is covering',
      'What would change my mind',
    ],
    formatGuidance:
      'Read the story through the eyes of someone who has shipped real products in this space — what does the press copy gloss over that the industry takes for granted.',
  };
}

function isValidFormat(c: FormatChoice): boolean {
  if (!c.formatId || !FORMAT_CATALOG[c.formatId]) return false;
  if (!Array.isArray(c.customHeadings) || c.customHeadings.length < 3) return false;
  if (!c.formatGuidance || c.formatGuidance.length < 20) return false;
  return true;
}

export const FORMATS = FORMAT_CATALOG;
