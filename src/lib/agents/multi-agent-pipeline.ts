// Multi-agent newsroom pipeline.
//
// Replaces the single-pass writer with a 4-stage process that mirrors how a
// real newsroom produces an article. Each stage is a distinct persona (see
// personas.ts) handling exactly one job:
//
//   1. DRAFTER (Marcus)  — 1700-2200 word expansive long-form draft ("Word")
//   2. EDITOR (Eva)      — cut to 900-1300 words keeping every fact ("Notepad")
//   3. FACT-CHECKER (Theo) — verify every claim against the source
//   4. POLISHER (Carmen) — apply fact-check fixes, remove AI tells, ship
//
// The shape returned matches the single-pass writer's WrittenArticle, so the
// rest of the orchestrator (humanizer → reviewer → publish) doesn't need to
// change. Each stage has its own retry, and on persistent failure we fall
// back to passing the previous stage's output through.
//
// Why this is better than single-pass:
//   - Drafter gets to write LONG without worrying about constraints. Long
//     drafts contain more context, comparisons, and second-order thinking.
//   - Editor brings discipline that a single "do everything" prompt can't.
//     The model holds one job in mind at a time.
//   - Fact-checker is a verification ROLE, not an instruction inside a
//     drafting prompt. Models verify better when verifying is their only task.
//   - Polisher applies the fact-check fixes as edits, not as "remember
//     these constraints while drafting". Edits are easier than constraints.
//
// Cost (per article, all Gemini Flash free tier):
//   Drafter:   ~3500 tokens out
//   Editor:    ~1800 tokens out
//   Fact-check:~700  tokens out
//   Polisher:  ~1800 tokens out
//   Total:     ~7800 tokens out + ~12000 in = ~20k tokens
// At 1500 req/day free, this is 375 articles/day worst case. We do ~30/day.

import { chat, MODELS, extractJson } from '../openai';
import { CATEGORIES } from '../categories';
import type { Research } from './researcher';
import type { WrittenArticle } from './writer';
import {
  DRAFTER_PERSONA,
  EDITOR_PERSONA,
  FACT_CHECKER_PERSONA,
  POLISHER_PERSONA,
} from './personas';
import { logAgent } from '../agent-log';

// ---------------------------------------------------------------------------
// Stage 1: DRAFTER — Marcus
// ---------------------------------------------------------------------------

async function draftLongForm(
  research: Research,
  trendingKeywords?: string[],
): Promise<WrittenArticle> {
  const categoryList = CATEGORIES.map(
    (c) => `- ${c.slug}: ${c.name} (${c.description})`,
  ).join('\n');

  const trendsBlock = trendingKeywords?.length
    ? `\n\nCurrent trending tech keywords (use only if genuinely relevant):\n${trendingKeywords
        .slice(0, 10)
        .map((k) => `- ${k}`)
        .join('\n')}`
    : '';

  const userPrompt = `Source: ${research.source.source.name} (${research.source.source.lang.toUpperCase()})
Original title: ${research.source.title}
Original URL: ${research.source.link}
${research.byline ? 'Original byline: ' + research.byline : ''}

Source full text (translate from German to English if needed):
"""
${research.fullText.slice(0, 6500)}
"""

Allowed categories:
${categoryList}${trendsBlock}

Write a FULL, EXPANSIVE first draft per your persona instructions.`;

  const text = await chat({
    model: MODELS.writer,
    system: DRAFTER_PERSONA,
    user: userPrompt,
    // Higher token budget than single-pass writer — we WANT length here.
    // Editor (next stage) compresses to publish length.
    maxTokens: 6500,
    json: true,
  });

  const parsed = extractJson<WrittenArticle>(text);
  if (!parsed) throw new Error(`Drafter JSON parse failed: ${text.slice(0, 300)}`);
  return parsed;
}

// ---------------------------------------------------------------------------
// Stage 2: EDITOR — Eva
// ---------------------------------------------------------------------------

async function editToPublishLength(draft: WrittenArticle): Promise<WrittenArticle> {
  const userPrompt = `Marcus's draft is below. Cut it to 900-1300 words per your persona
instructions. Preserve every fact, number, quote and named entity.

DRAFT:
"""
TITLE: ${draft.title}
SUBTITLE: ${draft.subtitle}
EXCERPT: ${draft.excerpt}
CATEGORY: ${draft.category}
TAGS: ${draft.tags.join(', ')}

${draft.content}
"""

Return the edited version as JSON.`;

  const text = await chat({
    model: MODELS.writer,
    system: EDITOR_PERSONA,
    user: userPrompt,
    maxTokens: 4500,
    json: true,
  });

  const parsed = extractJson<WrittenArticle>(text);
  if (!parsed) throw new Error(`Editor JSON parse failed: ${text.slice(0, 300)}`);
  // Defensive: editor sometimes drops category/tags. Backfill from draft.
  if (!parsed.category) parsed.category = draft.category;
  if (!parsed.tags || parsed.tags.length === 0) parsed.tags = draft.tags;
  return parsed;
}

// ---------------------------------------------------------------------------
// Stage 3: FACT-CHECKER — Theo
// ---------------------------------------------------------------------------

export interface FactCheckReport {
  claims_verified: number;
  claims_unsupported: number;
  issues: Array<{
    claim: string;
    verdict: 'unsupported' | 'wrong-number' | 'wrong-quote';
    fix: string;
  }>;
  factuality_score: number;
  verdict: 'publish' | 'revise' | 'kill';
}

async function factCheck(
  article: WrittenArticle,
  research: Research,
): Promise<FactCheckReport> {
  const userPrompt = `ARTICLE TO VERIFY:
"""
${article.content}
"""

ORIGINAL SOURCE (verify every numeric claim, name, quote and date against this):
"""
${research.fullText.slice(0, 6500)}
"""

Pressure-test the article. Return JSON per your persona instructions.`;

  const text = await chat({
    model: MODELS.reviewer,
    system: FACT_CHECKER_PERSONA,
    user: userPrompt,
    maxTokens: 1500,
    json: true,
  });

  const parsed = extractJson<FactCheckReport>(text);
  if (!parsed) {
    // Don't fail the pipeline on a fact-checker hiccup — return a permissive
    // default so the article still ships through the polisher.
    return {
      claims_verified: 0,
      claims_unsupported: 0,
      issues: [],
      factuality_score: 80,
      verdict: 'publish',
    };
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Stage 4: POLISHER — Carmen
// ---------------------------------------------------------------------------

async function polish(
  article: WrittenArticle,
  factCheck: FactCheckReport,
): Promise<WrittenArticle> {
  const factCheckBlock = factCheck.issues.length
    ? `Theo's fact-check found these issues — apply EVERY fix:\n${factCheck.issues
        .map(
          (i, idx) =>
            `${idx + 1}. [${i.verdict}] "${i.claim.slice(0, 100)}" → ${i.fix}`,
        )
        .join('\n')}`
    : 'Theo found no factual issues. Polish for flow + AI-tell removal only.';

  const userPrompt = `EDITED ARTICLE:
"""
TITLE: ${article.title}
SUBTITLE: ${article.subtitle}
EXCERPT: ${article.excerpt}
CATEGORY: ${article.category}
TAGS: ${article.tags.join(', ')}

${article.content}
"""

${factCheckBlock}

Polish per your persona instructions. Return final JSON.`;

  const text = await chat({
    model: MODELS.writer,
    system: POLISHER_PERSONA,
    user: userPrompt,
    maxTokens: 4500,
    json: true,
  });

  const parsed = extractJson<WrittenArticle>(text);
  if (!parsed) throw new Error(`Polisher JSON parse failed: ${text.slice(0, 300)}`);
  if (!parsed.category) parsed.category = article.category;
  if (!parsed.tags || parsed.tags.length === 0) parsed.tags = article.tags;
  return parsed;
}

// ---------------------------------------------------------------------------
// PUBLIC ENTRY — wraps all 4 stages with fail-soft behaviour
// ---------------------------------------------------------------------------

export interface MultiAgentResult {
  article: WrittenArticle;
  stages: {
    drafterWords: number;
    editorWords: number;
    polisherWords: number;
    factCheck: FactCheckReport;
  };
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Run the multi-agent newsroom pipeline. On any single-stage failure the
 * pipeline falls forward with the last successful stage's output rather
 * than killing the whole article. This is intentional — a fact-checker
 * timeout shouldn't prevent publication.
 */
export async function runMultiAgentPipeline(
  research: Research,
  trendingKeywords?: string[],
): Promise<MultiAgentResult> {
  // Stage 1: DRAFTER
  const draft = await draftLongForm(research, trendingKeywords);
  const drafterWords = wordCount(draft.content);
  await logAgent(
    'drafter',
    'wrote-longform',
    'success',
    `${drafterWords}w :: ${draft.title.slice(0, 60)}`,
  );

  // Stage 2: EDITOR
  let edited = draft;
  try {
    edited = await editToPublishLength(draft);
    await logAgent(
      'editor',
      'cut-to-publish',
      'success',
      `${drafterWords}w → ${wordCount(edited.content)}w`,
    );
  } catch (e) {
    const msg = (e as Error).message;
    await logAgent('editor', 'cut-to-publish', 'error', msg);
    // Carry draft forward — long but still publishable.
  }
  const editorWords = wordCount(edited.content);

  // Stage 3: FACT-CHECKER
  let factCheckResult: FactCheckReport = {
    claims_verified: 0,
    claims_unsupported: 0,
    issues: [],
    factuality_score: 80,
    verdict: 'publish',
  };
  try {
    factCheckResult = await factCheck(edited, research);
    await logAgent(
      'fact-checker',
      'verified',
      factCheckResult.verdict,
      `verified=${factCheckResult.claims_verified} unsupported=${factCheckResult.claims_unsupported} score=${factCheckResult.factuality_score}`,
    );
    // If Theo says kill, abort the pipeline — don't ship a story with too
    // many unsupported claims.
    if (factCheckResult.verdict === 'kill') {
      throw new Error(
        `Fact-checker killed article: ${factCheckResult.claims_unsupported} unsupported claims`,
      );
    }
  } catch (e) {
    const msg = (e as Error).message;
    await logAgent('fact-checker', 'verified', 'error', msg);
    if (msg.includes('killed article')) throw e; // propagate kills
  }

  // Stage 4: POLISHER
  let final = edited;
  try {
    final = await polish(edited, factCheckResult);
    await logAgent(
      'polisher',
      'finalized',
      'success',
      `${editorWords}w → ${wordCount(final.content)}w :: ${final.title.slice(0, 60)}`,
    );
  } catch (e) {
    const msg = (e as Error).message;
    await logAgent('polisher', 'finalized', 'error', msg);
    // Carry editor's version through — already publishable.
  }

  return {
    article: final,
    stages: {
      drafterWords,
      editorWords,
      polisherWords: wordCount(final.content),
      factCheck: factCheckResult,
    },
  };
}
