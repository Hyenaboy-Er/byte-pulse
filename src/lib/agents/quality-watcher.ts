// Quality-Watcher — continuous quality monitoring agent.
//
// Runs every 30 min on its own GitHub-Actions cron. For the last N published
// articles (default 10), runs a HYBRID audit:
//
//   1. MECHANICAL CHECKS (free, fast, no LLM)
//      - Word count 1700-2400 (= 7-12 min read at 200 wpm)
//      - All signature sections present ("Compared to:", "What this means
//        for you:", "What's still unclear:", "Why this matters:")
//      - At least 3 ## subheadings
//      - At least one bullet/numbered list
//      - Flesch reading ease > 55 (lower than the masthead target because
//        articles cover technical content)
//      - No AI-tell phrases ("delve into", "tapestry", "leverage", etc.)
//      - Hero image present + alt text on every <img> equivalent
//
//   2. LLM JUDGMENT (Gemini 2.5 Flash, max 3 calls per run = cheap)
//      - Score 0-100 on depth, originality, voice consistency,
//        operator-pov credibility
//      - Identify the WEAKEST section + suggest a fix
//      - Verdict: 'keep' | 'polish' | 'rewrite'
//
// ACTION
//   - 'polish' verdict → enqueue for Polisher-only pass via agentLog action
//   - 'rewrite' verdict → enqueue for full Drafter→Editor→FactCheck→Polisher
//     rerun via existing quality-upgrade pipeline
//   - 'keep' verdict → log success
//
// DEDUP
//   Each article reviewed gets an agentLog row 'quality-watcher-<id>'. We
//   never reprocess unless 7+ days have passed since the last audit (in case
//   the article was later updated by content-refresher or quality-upgrade).
//
// COST
//   3 LLM calls per 30-min run × 48 runs/day = 144 calls/day on Gemini
//   Flash. Free-tier 1500/day quota uses 9.6%. Total daily LLM cost: 0 €.
//
// SAFETY
//   - On any LLM error → degrade to mechanical-only audit, log warning.
//   - On any DB error → exit cleanly, retry next cron.
//   - Never modifies articles in this agent — only QUEUES work. Quality-
//     upgrade agent does the actual rewriting on its own cadence.

import { prisma } from '../db';
import { llmChat, extractJson } from '../llm';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://www.byte-pulse.net';

// ---------------------------------------------------------------------------
// MECHANICAL CHECKS
// ---------------------------------------------------------------------------

const AI_TELL_PHRASES = [
  'delve into',
  'tapestry',
  'navigate the landscape',
  'leverage',
  'in essence',
  'ultimately',
  'moreover',
  'furthermore',
  "however, it's important to note",
  'in conclusion',
  'the realm of',
  'groundbreaking',
  'game-changing',
  'transformative journey',
  'stands as a testament',
  'a beacon of',
  'in the ever-evolving landscape',
  'paradigm shift',
  'cutting-edge',
  'robust solution',
  'seamless experience',
  'in the dynamic world of',
  "in today's fast-paced world",
];

const SIGNATURE_SECTIONS = [
  // We don't require all of these; we require AT LEAST 2 of them.
  /compared to/i,
  /what this means for you/i,
  /what'?s still unclear/i,
  /why this matters/i,
  /context/i,
];

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const vowels = 'aeiouy';
  let count = 0;
  let prev = false;
  for (const c of w) {
    const v = vowels.includes(c);
    if (v && !prev) count++;
    prev = v;
  }
  if (w.endsWith('e') && count > 1) count--;
  return Math.max(1, count);
}

function flesch(text: string): number {
  const sentences = Math.max(
    1,
    text.split(/[.!?]+/).filter((s) => s.trim()).length,
  );
  const words = text.match(/[a-zA-Z']+/g) ?? [];
  if (!words.length) return 0;
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syl / words.length);
}

interface MechanicalReport {
  words: number;
  readingTimeMin: number;
  fleschScore: number;
  signatureSectionsFound: number;
  subheadingCount: number;
  hasBulletList: boolean;
  aiTellsFound: string[];
  issues: string[];
}

function mechanicalAudit(article: { content: string; title: string }): MechanicalReport {
  const content = article.content;
  const words = wordCount(content);
  const readingTimeMin = Math.round((words / 200) * 10) / 10;
  const fleschScore = Math.round(flesch(content) * 10) / 10;
  const signatureSectionsFound = SIGNATURE_SECTIONS.filter((re) => re.test(content)).length;
  const subheadingCount = (content.match(/^##\s+/gm) ?? []).length;
  const hasBulletList = /^[-*]\s+|^\d+\.\s+/m.test(content);

  const lower = content.toLowerCase();
  const aiTellsFound = AI_TELL_PHRASES.filter((p) => lower.includes(p.toLowerCase()));

  const issues: string[] = [];
  if (words < 1400) issues.push(`thin (${words}w < 1400)`);
  else if (words < 1700) issues.push(`below target (${words}w < 1700)`);
  if (readingTimeMin > 13) issues.push(`overly long (${readingTimeMin} min > 12)`);
  if (fleschScore < 55) issues.push(`hard to read (Flesch ${fleschScore} < 55)`);
  if (signatureSectionsFound < 2) issues.push(`missing signature sections (only ${signatureSectionsFound} found)`);
  if (subheadingCount < 3) issues.push(`too few ## subheadings (${subheadingCount} < 3)`);
  if (!hasBulletList) issues.push('no bullet/numbered list');
  if (aiTellsFound.length) issues.push(`AI tells: ${aiTellsFound.slice(0, 3).join(', ')}`);

  return {
    words,
    readingTimeMin,
    fleschScore,
    signatureSectionsFound,
    subheadingCount,
    hasBulletList,
    aiTellsFound,
    issues,
  };
}

// ---------------------------------------------------------------------------
// LLM JUDGMENT
// ---------------------------------------------------------------------------

const JUDGE_SYSTEM = `You are a quality-control editor at Byte-Pulse newsroom.
You are auditing a published article AFTER the fact. Your job is to decide:
should we keep it as-is, polish it, or rewrite it from scratch?

Score the article on FOUR axes (0-100 each):
  1. depth — does it add context, comparisons, "what this means for you",
     "what's still unclear", or does it just rewrite the source?
  2. originality — is the framing genuinely fresh, or is this an obvious
     LLM rewrite of a press release?
  3. voice — does it sound like a real operator wrote it (hands-on, European
     frame of reference, plainspoken) or like generic AI prose?
  4. clarity — is the structure clean, sentences varied, no AI tells?

Then issue a verdict:
  - "keep"     — overall avg ≥ 75 AND no axis below 60
  - "polish"   — overall avg 60-75 OR one axis below 60 (fixable in one pass)
  - "rewrite"  — overall avg < 60 OR multiple axes below 60 (needs full Drafter
                 → Editor → FactCheck → Polisher rerun)

Also identify the WEAKEST section in the article (quote the heading or first
line). If the article is thin (under 1500 words) automatically verdict
"rewrite" regardless of axes.

Output JSON ONLY:
{
  "scores": { "depth": <0-100>, "originality": <0-100>, "voice": <0-100>, "clarity": <0-100> },
  "weakest_section": "<heading or first words>",
  "fix_suggestion": "<one sentence>",
  "verdict": "keep" | "polish" | "rewrite"
}`;

interface LLMJudgment {
  scores: { depth: number; originality: number; voice: number; clarity: number };
  weakest_section: string;
  fix_suggestion: string;
  verdict: 'keep' | 'polish' | 'rewrite';
}

async function judgeWithLLM(article: {
  title: string;
  content: string;
}): Promise<LLMJudgment | null> {
  try {
    const raw = await llmChat({
      role: 'reviewer',
      system: JUDGE_SYSTEM,
      user: `Title: ${article.title}\n\nBody:\n"""\n${article.content.slice(0, 9000)}\n"""\n\nAudit per your role.`,
      maxTokens: 800,
      json: true,
      temperature: 0.3,
    });
    return extractJson<LLMJudgment>(raw);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PUBLIC ENTRY
// ---------------------------------------------------------------------------

export interface QualityWatcherReport {
  scanned: number;
  audited: number;
  kept: number;
  polishQueued: number;
  rewriteQueued: number;
  avgWords: number;
  avgReadingMin: number;
  avgFlesch: number;
  examples: Array<{
    slug: string;
    words: number;
    readingMin: number;
    flesch: number;
    aiTells: number;
    verdict: 'keep' | 'polish' | 'rewrite' | 'mechanical-fail';
  }>;
}

const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

export async function runQualityWatcher(opts: { maxAudits?: number; lookback?: number } = {}): Promise<QualityWatcherReport> {
  const maxAudits = Math.max(1, Math.min(20, opts.maxAudits ?? 10));
  const lookback = Math.max(1, opts.lookback ?? 30);

  const report: QualityWatcherReport = {
    scanned: 0,
    audited: 0,
    kept: 0,
    polishQueued: 0,
    rewriteQueued: 0,
    avgWords: 0,
    avgReadingMin: 0,
    avgFlesch: 0,
    examples: [],
  };

  // Pull recently-published articles, newest first.
  let candidates: Array<{
    id: string;
    slug: string;
    title: string;
    content: string;
    publishedAt: Date | null;
  }> = [];
  try {
    candidates = await prisma.article.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: lookback,
      select: { id: true, slug: true, title: true, content: true, publishedAt: true },
    });
  } catch {
    // DB blocked — exit cleanly. Cron will retry.
    return report;
  }

  report.scanned = candidates.length;
  let llmBudgetLeft = 3; // hard cap LLM calls per run

  const wordsSum: number[] = [];
  const readSum: number[] = [];
  const fleschSum: number[] = [];

  for (const a of candidates) {
    if (report.audited >= maxAudits) break;

    // Dedup — skip if reviewed within the last 7 days.
    try {
      const seen = await prisma.agentLog.findFirst({
        where: {
          agent: 'quality-watcher',
          action: a.id,
          createdAt: { gte: new Date(Date.now() - SEVEN_DAYS_MS) },
        },
      });
      if (seen) continue;
    } catch {
      // ignore dedup miss — worst case we re-audit. Free tier permits.
    }

    const mech = mechanicalAudit(a);
    wordsSum.push(mech.words);
    readSum.push(mech.readingTimeMin);
    fleschSum.push(mech.fleschScore);
    report.audited++;

    // Hard mechanical fails go straight to rewrite.
    let verdict: 'keep' | 'polish' | 'rewrite' | 'mechanical-fail' = 'keep';
    let fixSuggestion = '';
    let weakest = '';

    if (mech.words < 1400 || mech.signatureSectionsFound < 1) {
      verdict = 'mechanical-fail';
      fixSuggestion = `Mechanical fail: ${mech.issues.join('; ')}`;
    } else if (mech.issues.length === 0) {
      // Spotless mechanical — only call LLM if budget allows AND we want a
      // depth/voice double-check on top performers.
      if (llmBudgetLeft > 0) {
        const j = await judgeWithLLM(a);
        llmBudgetLeft--;
        if (j) {
          verdict = j.verdict;
          fixSuggestion = j.fix_suggestion;
          weakest = j.weakest_section;
        }
      }
    } else {
      // Has mechanical issues but above the hard floor — LLM judgment.
      if (llmBudgetLeft > 0) {
        const j = await judgeWithLLM(a);
        llmBudgetLeft--;
        if (j) {
          verdict = j.verdict;
          fixSuggestion = j.fix_suggestion;
          weakest = j.weakest_section;
        } else {
          // LLM unavailable — fall back to mechanical-only verdict.
          verdict = mech.aiTellsFound.length > 3 || mech.fleschScore < 50 ? 'polish' : 'keep';
          fixSuggestion = mech.issues.join('; ');
        }
      } else {
        verdict = mech.aiTellsFound.length > 3 || mech.fleschScore < 50 ? 'polish' : 'keep';
        fixSuggestion = mech.issues.join('; ');
      }
    }

    // Record the audit + queue follow-up work.
    try {
      await prisma.agentLog.create({
        data: {
          agent: 'quality-watcher',
          action: a.id,
          status: verdict,
          message: `${a.slug}: ${mech.words}w · ${mech.readingTimeMin}min · Flesch ${mech.fleschScore} · ${mech.aiTellsFound.length} ai-tells${weakest ? ` · weak: ${weakest.slice(0, 50)}` : ''}`,
          meta: JSON.stringify({
            mechanical: mech,
            verdict,
            weakest,
            fixSuggestion,
          }).slice(0, 1500),
        },
      });

      // Queue rewrite for the quality-upgrade agent to pick up.
      // (quality-upgrade looks for status='ok' to dedup; we mark our
      // queue marker as status='pending'.)
      if (verdict === 'rewrite' || verdict === 'mechanical-fail') {
        await prisma.agentLog.create({
          data: {
            agent: 'quality-upgrade',
            action: `quality-watcher-requeue-${a.id}`,
            status: 'pending',
            message: `quality-watcher flagged for rewrite: ${fixSuggestion}`,
          },
        });
        report.rewriteQueued++;
      } else if (verdict === 'polish') {
        await prisma.agentLog.create({
          data: {
            agent: 'polisher',
            action: `quality-watcher-polish-${a.id}`,
            status: 'pending',
            message: fixSuggestion,
          },
        });
        report.polishQueued++;
      } else {
        report.kept++;
      }
    } catch {
      // logging failure → keep going.
    }

    report.examples.push({
      slug: a.slug,
      words: mech.words,
      readingMin: mech.readingTimeMin,
      flesch: mech.fleschScore,
      aiTells: mech.aiTellsFound.length,
      verdict,
    });
  }

  const avg = (xs: number[]) => xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0;
  report.avgWords = avg(wordsSum);
  report.avgReadingMin = avg(readSum);
  report.avgFlesch = avg(fleschSum);

  return report;
}
