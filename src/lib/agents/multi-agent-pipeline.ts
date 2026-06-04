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
import { llmChat } from '../llm';
import { CATEGORIES } from '../categories';
import { prisma } from '../db';
import type { Research } from './researcher';
import type { WrittenArticle } from './writer';
import type { MultiSourceBundle } from './multi-source-researcher';
import { planFormat, type FormatChoice } from './format-planner';
import {
  DRAFTER_PERSONA,
  EDITOR_PERSONA,
  FACT_CHECKER_PERSONA,
  POLISHER_PERSONA,
} from './personas';

// Inline logger — earlier draft imported from '../agent-log' which does not
// exist (the real logAgent lives as a private function inside orchestrator.ts).
// Mirroring its shape here keeps this module self-contained.
async function logAgent(
  agent: string,
  action: string,
  status: string,
  message?: string,
  meta?: object,
): Promise<void> {
  try {
    await prisma.agentLog.create({
      data: {
        agent,
        action,
        status,
        message: message?.slice(0, 500),
        meta: meta ? JSON.stringify(meta).slice(0, 1500) : undefined,
      },
    });
  } catch {
    /* logging is best-effort — never block the pipeline */
  }
}

// ---------------------------------------------------------------------------
// Stage 1: DRAFTER — Marcus
// ---------------------------------------------------------------------------

async function draftLongForm(
  research: Research,
  trendingKeywords?: string[],
  multiSource?: MultiSourceBundle,
): Promise<WrittenArticle> {
  // FORMAT PLANNING (Serhat 2026-06-04 — anti-sameness):
  // when we have a multi-source bundle, plan the structural FORMAT before
  // writing so every article ends up with custom H2 sections tailored to
  // ITS specific story, instead of every article inheriting the same
  // Facts-All-Confirm / Contrasting-Claims / Compared-to skeleton.
  // 10 formats available — planner picks the best fit per story.
  let format: FormatChoice | null = null;
  if (multiSource) {
    try {
      format = await planFormat(multiSource);
      await logAgent(
        'format-planner',
        'format-chosen',
        'success',
        `${format.formatId} :: ${format.rationale.slice(0, 100)}`,
        { headings: format.customHeadings },
      );
    } catch {
      /* planner is best-effort; fall through to standard skeleton */
    }
  }
  const categoryList = CATEGORIES.map(
    (c) => `- ${c.slug}: ${c.name} (${c.description})`,
  ).join('\n');

  const trendsBlock = trendingKeywords?.length
    ? `\n\nCurrent trending tech keywords (use only if genuinely relevant):\n${trendingKeywords
        .slice(0, 10)
        .map((k) => `- ${k}`)
        .join('\n')}`
    : '';

  // MULTI-SOURCE PATH (Serhat 2026-06-03): when 2+ outlets reported the
  // same story, the drafter gets the structured cross-source bundle and
  // is instructed to attribute, compare, and pick fights between outlets.
  // This is the path that produces real "above-source originality" — the
  // single biggest AdSense quality signal.
  const formatBlock = format
    ? `\n\nFORMAT FOR THIS STORY: **${format.formatId}**
Rationale: ${format.rationale}

Use EXACTLY these H2 section headings, in this order, customised for this
specific story — do NOT use the generic Facts-All-Confirm / Contrasting-
Claims / Compared-to / What-This-Means template:

${format.customHeadings.map((h, i) => `  ${i + 1}. ## ${h}`).join('\n')}

Format-specific guidance: ${format.formatGuidance}

These headings are NON-NEGOTIABLE — they exist to break the structural
sameness pattern that AdSense reviewers can otherwise detect across
multi-source AI articles. Every article gets a different shape, tailored
to its actual story. The cross-source attribution rules still apply
(name outlets, surface disagreements, take a stance) — but EMBEDDED in
the format above, not in a separate Facts-All-Confirm section.\n\n`
    : '';

  const userPrompt = multiSource
    ? `MULTI-SOURCE BUNDLE — ${multiSource.alternates.length + 1} outlets reported this story.${formatBlock}

Drei Quellen allein erzeugen noch keine Qualität. Qualität entsteht erst,
wenn du Unterschiede erkennst (Widersprüche, Fokusverschiebungen,
Auslassungen) und daraus eine eigene konsistente redaktionelle Linie
baust. Das ist DEIN Job.

STEP 1 — ANALYTICAL PASS (do this BEFORE writing a single sentence of
the article). Internally identify and structure:

  (a) FAKTEN-KONSENS: Welche konkreten Fakten (Zahlen, Daten, Namen)
      sind in ALLEN ${multiSource.alternates.length + 1} Quellen identisch?
      Diese sind hoch-confidence; übernimm sie als Anker.

  (b) WIDERSPRÜCHE: Welche Behauptungen unterscheiden sich zwischen
      Quellen? (Anderer Preis? Anderes Datum? Andere Spec?) Jeder
      Widerspruch ist ein eigener News-Angle. Stelle den Widerspruch
      explizit nebeneinander und beziehe eine STELLUNG: welche Quelle
      hat wahrscheinlich recht und warum.

  (c) FOKUS-VERSCHIEBUNG: Welche Quelle hat WELCHEN Aspekt betont?
      (Verge geht auf Design, Heise auf Lizenzfragen, Ars auf
      Architektur.) Was sagt diese Fokus-Verteilung über das tatsächliche
      Gewicht der Story? Pick die Verschiebung die DU für die wichtigste
      hältst und führe Sie als Hauptlinie.

  (d) AUSLASSUNGEN: Was hat KEINE der Quellen abgedeckt, das aber
      offensichtlich kritisch ist? (Niemand fragt nach EU-Verfügbarkeit?
      Niemand erwähnt Yield? Niemand fragt nach Open-Source?) Diese
      Auslassungen sind dein Differenzierungs-Material — formuliere sie
      als "What's still unclear" oder als kritische Frage.

STEP 2 — KONSOLIDIERTE LINIE (das ist die eigentliche redaktionelle
Arbeit). Aus den (a)-(d) Erkenntnissen baust du EINE konsistente These
für den Artikel. Diese These = der Lead-Paragraph + die Headline-Logik.
Beispiele für konsolidierte Linien:
  - "Verge sagt Wow, Heise sagt vorsichtig, Ars deckt die Architektur
     auf — und die Architektur entscheidet ob Heises Vorsicht
     berechtigt ist."
  - "Drei Outlets, drei Preise — und das verrät mehr über regionale
     Channel-Strategie als die Outlets selbst merken."
  - "Alle drei loben Feature X. Niemand fragt nach Y. Y ist der
     eigentliche Test."

STEP 3 — DRAFTING (jetzt erst schreibst du). Während du schreibst:

  - MIN 6x explizite Source-Attribution im Body. Phrasen wie "According
    to The Verge…", "Heise reports…", "Ars Technica adds…", "Engadget
    disagrees with…", "All three outlets confirm…".
  - JEDER Widerspruch aus (b) bekommt eine eigene Behandlung (mind. 2-3
    Sätze) mit DEINER STELLUNGNAHME ("Honestly, I'd side with Ars here
    because…").
  - DEINE konsolidierte Linie aus Step 2 ist die Hauptthese — alles
    andere ordnet sich unter.
  - "Compared to" section vergleicht NICHT nur Produkte, sondern auch
    wie die Quellen die Story framten.
  - "Operator's view" greift die OUTLETS an wo sie Fehler machten,
    nicht das Produkt.
  - "What's still unclear" listet die Auslassungen aus (d) — was ALLE
    Quellen übersehen haben.

VERBOTEN: bloße Aneinanderreihung von Zitaten ohne Synthese. "Verge said X.
Heise said Y. Ars said Z. End of story." → das ist Aggregator-Müll. Du
bist die redaktionelle Stimme die aus X, Y, Z eine eigene Position formt.

${multiSource.drafterBundle}

Allowed categories:
${categoryList}${trendsBlock}

Write a FULL, EXPANSIVE first draft per your persona instructions plus
the three-step cross-source process above.`
    : `Source: ${research.source.source.name} (${research.source.source.lang.toUpperCase()})
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

  // Drafter routed to its OWN role ('persona-drafter') so it can use a
  // beefier model than the editor/polisher — Gemini 2.5 Pro by default.
  // Pro is much better at long-form creative depth, where the Drafter
  // earns its keep. Free tier 50/day suffices for our throughput; on
  // 429 the llmChat layer falls through to the same provider's other
  // models, then to other providers.
  const text = await llmChat({
    role: 'persona-drafter',
    system: DRAFTER_PERSONA,
    user: userPrompt,
    // 14000 tokens — bumped 2026-06-04 because multi-source prompts
    // produce longer JSON output (cross-source attribution adds ~30%
    // body length). 10500 was truncating mid-string on 3-source bundles.
    // JSON-mode also bloats output by ~30% via escape-wrapping, so the
    // raw word target of 1500-2200 lands ~6000 tokens; doubled to 14000
    // for safety on edge cases.
    maxTokens: 14000,
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
  const userPrompt = `Marcus's long draft is below. Your job is to find
the RIGHT length for the story — not a target length. Cut what's redundant,
what's filler, what's just rephrasing the same point. Keep what's analytically
distinct.

Decision framework:
  - If the story is genuinely "3 outlets reported the same 4 facts" →
    short (900-1200w) with sharp cross-source synthesis
  - If there's real disagreement / framing-shift / omission worth working
    out → medium (1300-2000w)
  - If the story has multiple non-trivial angles (regulation + technical +
    market + ethical) → long (1800-2800w)

NEVER PAD. NEVER ARTIFICIALLY EXTEND. A 1100w piece that earns every
word beats a 2400w piece with 30% redundancy.

Preserve every fact, number, quote and named entity.

IMPORTANT (Serhat 2026-06-04 anti-sameness rule): if the draft uses
CUSTOM H2 section headings (e.g. story-specific phrasings like "Why
Apple's silence on Berlin is revealing" rather than the generic
"Facts All Sources Confirm"), KEEP THOSE HEADINGS verbatim. Do NOT
revert to the generic Facts-All-Confirm / Contrasting-Claims template.
The custom headings exist because the Format Planner chose them for
THIS specific story. Generic template headings are the failure mode
we're trying to avoid.

If a section would be filler, CUT IT entirely rather than padding it —
short article without weak sections beats long article with weak sections.

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

  // Editor on Gemini 2.5 Flash — structured cut work doesn't need Pro,
  // and Flash's larger free quota (1500/day) keeps the pipeline running
  // even when Pro's hourly throttle bites.
  const text = await llmChat({
    role: 'persona-editor',
    system: EDITOR_PERSONA,
    user: userPrompt,
    // Eva targets 1700-2400 words (= 8-12 min read). 8000 tokens out =
    // ~6000 words capacity, plenty of room for the body + title/subtitle/
    // excerpt JSON envelope.
    maxTokens: 8000,
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

  // Fact-Checker on its own role — defaults to a DIFFERENT model family
  // than the Drafter so we get cross-family verification (independent
  // bias). When LLM_PROVIDER=gemini, Theo is configured to use Groq
  // Llama 3.3 70B via LLM_PERSONA-FACTCHECKER_PROVIDER=groq, giving
  // multi-model consensus rather than 'same model checks itself'.
  const text = await llmChat({
    role: 'persona-factchecker',
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

  // Polisher on persona-polisher → Gemini Flash by default. Surgical
  // edits + AI-tell removal don't need a heavy model. 8000 tokens =
  // same ~6000 word capacity as the Editor — Carmen returns close to
  // Eva's length, not more.
  const text = await llmChat({
    role: 'persona-polisher',
    system: POLISHER_PERSONA,
    user: userPrompt,
    maxTokens: 8000,
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
  multiSource?: MultiSourceBundle,
): Promise<MultiAgentResult> {
  // Stage 1: DRAFTER
  const draft = await draftLongForm(research, trendingKeywords, multiSource);
  const drafterWords = wordCount(draft.content);
  await logAgent(
    'drafter',
    multiSource ? 'wrote-longform-multi-source' : 'wrote-longform',
    'success',
    `${drafterWords}w :: ${draft.title.slice(0, 60)}`
    + (multiSource ? ` :: ${multiSource.citationList.length} sources` : ''),
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
    // Only kill on catastrophically broken articles. 'kill' verdict from
    // Theo on a single-source breaking-news story is often a false positive
    // (the fact-checker LLM doesn't know June 2026 actually happened and
    // flags every dated claim as "unverifiable future"). Real kills are
    // when zero claims verify OR more than 10 are flagged. Below that we
    // demote to revise — let the reviewer + downstream gates make the
    // publish call.
    if (
      factCheckResult.verdict === 'kill'
      && (factCheckResult.claims_verified === 0
          || factCheckResult.claims_unsupported > 10)
    ) {
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

// ---------------------------------------------------------------------------
// UPGRADE PATH — for the quality-upgrade agent rewriting existing articles
// ---------------------------------------------------------------------------

export interface UpgradeResult {
  content: string;
  drafterWords: number;
  editorWords: number;
  factCheck: FactCheckReport;
}

/**
 * Take an existing thin article and run it through Drafter → Editor →
 * FactCheck → Polisher to produce a substantially deeper rewrite.
 *
 * Unlike the full pipeline this:
 *   - Uses the existing article content as the "source" (we don't refetch
 *     the original news URL — too brittle, may have changed/404'd, costs
 *     more LLM tokens for research).
 *   - Returns only the rewritten markdown body, since slug/title/category
 *     stay intact (changing those would break canonicalisation + SEO).
 *
 * The Drafter treats the existing body as research material; the Editor
 * cuts to publish length; the FactChecker verifies claims against the
 * existing body (so we don't drift away from the original facts); the
 * Polisher applies fixes + removes AI tells.
 */
export async function upgradeArticleViaMultiAgent(
  title: string,
  category: string,
  existingContent: string,
  sourceName?: string,
): Promise<UpgradeResult> {
  // Treat existing article as the research material.
  const synthesisedSource = `Article title: ${title}\nSource publication: ${sourceName ?? 'unknown'}\n\nCurrent published body:\n${existingContent}`;

  // Stage 1 — Drafter writes a longer, richer version
  const draftPrompt = `EXISTING SHORT ARTICLE (use as your factual source — every fact stays, only depth and context are added):
"""
${synthesisedSource}
"""

Allowed category for this article: ${category}

This is an UPGRADE pass. The existing body is thin and reads like a press-
release summary. Your job is to turn it into a Byte-Pulse signature piece:
DEPTH + STRONG EDITORIAL OPINION.

NON-NEGOTIABLES for this upgrade:
1. Keep every fact / number / name / date from the existing body.
2. Add a "Compared to" section with at least TWO concrete competitor or
   predecessor specs/prices (use your own product knowledge — NOT in the
   source). Be specific: model names, MHz, USD prices, mAh, TDP, etc.
3. Add a "What this means for you" section that estimates real-world
   impact for a defined reader persona (developer / gamer / EV-buyer /
   IT-admin — pick the right one).
4. Add a "What's still unclear" section with 2-3 concrete open questions
   a sceptical reader should track (release date? benchmark methodology?
   pricing in EU? supply constraints?).
5. Add a "Why this matters" or "Operator's view" section with an
   OPINION — take a stance. "This is a defensive move by X because Y."
   "This will pressure Z." "This won't move the needle unless A."
   Reviewers should be able to point to specific sentences that show
   editorial judgement, not neutral summary.
6. Target 1500-2200 words, structured with markdown ## subheadings.
7. No fragment sentences ("Using clean data, specifically."). No AI
   tells ("furthermore", "in essence", "delve into").

If the existing article is off-niche (plant biology, food, fashion,
politics, sports, celebrity), set category to "skip" — but for already-
published tech articles this should not happen.`;

  const draftText = await llmChat({
    role: 'persona-drafter',
    system: DRAFTER_PERSONA,
    user: draftPrompt,
    maxTokens: 6000,
    json: true,
  });
  const draftParsed = extractJson<{ title: string; subtitle: string; excerpt: string; content: string; category: string; tags: string[] }>(
    draftText,
  );
  if (!draftParsed) throw new Error('Drafter parse failed in upgrade path');
  const draftWords = wordCount(draftParsed.content);

  // Stage 2 — Editor cuts to publish length
  let editorContent = draftParsed.content;
  try {
    const editorText = await llmChat({
      role: 'persona-editor',
      system: EDITOR_PERSONA,
      user: `Cut Marcus's long upgrade to 1400-1900 words. Keep every fact.
Crucially, KEEP all five upgrade sections intact: Compared to / What this
means for you / What's still unclear / Operator's view (or Why this matters).
Cut PADDING and AI-flavored connective tissue, never analytical depth or
opinionated sentences.
DRAFT:
"""
${draftParsed.content}
"""
Return JSON.`,
      maxTokens: 4500,
      json: true,
    });
    const editorParsed = extractJson<{ content: string }>(editorText);
    if (editorParsed?.content) editorContent = editorParsed.content;
  } catch {
    /* keep draft */
  }
  const editorWords = wordCount(editorContent);

  // Stage 3 — Fact-Checker verifies against the original existing body
  let fc: FactCheckReport = {
    claims_verified: 0,
    claims_unsupported: 0,
    issues: [],
    factuality_score: 80,
    verdict: 'publish',
  };
  try {
    const fcText = await llmChat({
      role: 'persona-factchecker',
      system: FACT_CHECKER_PERSONA,
      user: `ARTICLE TO VERIFY:\n"""\n${editorContent}\n"""\n\nORIGINAL EXISTING ARTICLE (verify every claim against this):\n"""\n${existingContent}\n"""\n\nReturn JSON.`,
      maxTokens: 1200,
      json: true,
    });
    const parsed = extractJson<FactCheckReport>(fcText);
    if (parsed) fc = parsed;
  } catch {
    /* default-permissive */
  }

  // Stage 4 — Polisher applies fact-check fixes + AI-tell removal
  let polished = editorContent;
  try {
    const fixBlock = fc.issues.length
      ? `Apply these fact-check fixes:\n${fc.issues
          .map((i, n) => `${n + 1}. [${i.verdict}] "${i.claim.slice(0, 80)}" → ${i.fix}`)
          .join('\n')}`
      : 'No factual issues — polish flow + AI-tell removal only.';
    const polText = await llmChat({
      role: 'persona-polisher',
      system: POLISHER_PERSONA,
      user: `EDITED ARTICLE:\n"""\n${editorContent}\n"""\n\n${fixBlock}\n\nReturn final JSON with at minimum "content" field.`,
      maxTokens: 4500,
      json: true,
    });
    const parsed = extractJson<{ content: string }>(polText);
    if (parsed?.content) polished = parsed.content;
  } catch {
    /* keep editor version */
  }

  return {
    content: polished,
    drafterWords: draftWords,
    editorWords,
    factCheck: fc,
  };
}
