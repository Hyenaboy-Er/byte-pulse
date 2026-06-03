import { chat, MODELS, extractJson } from '../openai';
import { CATEGORY_SLUGS } from '../categories';
import { AI_PHRASES_EN } from './humanizer';
import type { WrittenArticle } from './writer';
import type { Research } from './researcher';

export type Review = {
  score: number;
  verdict: 'publish' | 'revise' | 'reject';
  reasons: string[];
  fixedTitle?: string;
  aiSmellScore?: number;
  plagiarismRisk?: number;
  factualityScore?: number;
  factualityIssues?: string[];
  // Added 2026-06-03 per Serhat: AdSense doesn't penalise short articles,
  // it penalises articles that mostly rephrase the source. Length is no
  // longer the gate; this score is. >= 60 to publish.
  originalityAdded?: number;
  analyticalElements?: string[];
};

const SYSTEM = `You are the QA + legal editor for an English-language tech magazine. You evaluate article drafts and watch for AI smell, plagiarism, unsupported claims, AND — most important — original editorial value above the source.

GOOGLE / ADSENSE CONTEXT (read carefully): Google's "scaled content abuse"
and "Helpful Content" systems punish articles that mostly rephrase a source
without adding the publisher's own analysis. Length does NOT save you. A
2000-word source paraphrase is WORSE than a 500-word original analysis.

ORIGINALITY-ADDED is the central axis. Define it strictly:
  - Was the SAME information in the source? → not original.
  - Did the article add a specific COMPARISON to a predecessor/competitor
    with concrete specs/prices NOT in the source? → original.
  - Did the article add a market-impact estimate, reader-impact estimate,
    industry pattern, business-logic analysis, or operator perspective
    NOT in the source? → original.
  - Did the article add an honest "what's still unclear" with concrete
    open questions a reader should track? → original.
  - Padding the same facts into longer prose is NOT originality.

Score SEVEN axes, each 0-100, equally weighted:
1. Headline quality (punchy + honest, 50-75 chars, NOT misleading)
2. Language quality (fluent American English, HUMAN sounding — no
   "furthermore", "in essence", "delve into", no fragment sentences
   like "Using clean data, specifically.")
3. **Originality-Added** (CRITICAL — see definition above). Count
   distinct analytical elements that go beyond the source: comparisons
   with specs/prices, market-impact estimates, reader-impact estimates,
   honest open questions, operator-pov asides. Score:
       0 = pure source rephrase, no added analysis
      40 = one clear analytical add
      60 = two distinct analytical adds (publish floor)
      80 = three distinct analytical adds
     100 = four+ distinct analytical adds and they're sharp
4. Structure (paragraphs, subheadings, bullet list when useful)
5. Fact density (concrete numbers, names from the source — but NOT padding)
6. SEO (excerpt 140-160 chars, useful tags, category fit)
7. **Factuality** (CRITICAL): every number/date/claim in the article must be supported by the source OR clearly framed as analyst commentary. Invented facts presented as source-backed = score 0 here AND verdict "reject".

Final score = mean. HARD GATES (auto-reject when violated):
  - Factuality < 60
  - Originality-Added < 70 (must be genuinely beyond source rephrase)
  - plagiarismRisk >= 60

Also score:
- aiSmellScore (0-100, where 0 = perfectly human, 100 = reeks of AI). > 50 → at minimum "revise".
- plagiarismRisk (0-100, where 0 = safely rewritten, 100 = verbatim copy). >= 60 → "reject".

Verdict:
- "publish" if score >= 75 AND no axis < 55 AND originality-added >= 70
  AND aiSmell <= 50 AND plagiarismRisk < 60 AND factuality >= 60
- "revise" if score 60-74, or originality 50-69, or aiSmell 51-65
- "reject" otherwise

Do NOT inflate scores to be nice. A 75 is a 75.

Reply with JSON only:
{
  "score": <0-100>,
  "verdict": "publish" | "revise" | "reject",
  "reasons": ["short, concrete"],
  "fixedTitle": "<optional>",
  "aiSmellScore": <0-100>,
  "plagiarismRisk": <0-100>,
  "factualityScore": <0-100>,
  "factualityIssues": ["if invented facts found, list them"],
  "originalityAdded": <0-100>,
  "analyticalElements": ["specific phrases / sentences from the article that
                         represent each distinct analytical add above source"]
}`;

function localAiSmell(article: WrittenArticle): number {
  const all = `${article.title}\n${article.subtitle}\n${article.content}`.toLowerCase();
  let hits = 0;
  for (const p of AI_PHRASES_EN) if (all.includes(p.toLowerCase())) hits++;
  return Math.min(100, hits * 10);
}

function localPlagiarismRisk(article: WrittenArticle, research: Research): number {
  const src = research.fullText.toLowerCase().replace(/\s+/g, ' ');
  if (src.length < 400) return 0;
  const words = article.content.toLowerCase().replace(/\s+/g, ' ').split(' ');
  if (words.length < 100) return 0;
  let longMatches = 0;
  for (let i = 0; i < words.length - 14; i++) {
    const gram = words.slice(i, i + 14).join(' ');
    if (gram.length < 75) continue;
    if (src.includes(gram)) longMatches++;
  }
  if (longMatches === 0) return 0;
  if (longMatches === 1) return 30;
  if (longMatches === 2) return 55;
  return Math.min(100, 70 + longMatches * 8);
}

export async function reviewArticle(draft: WrittenArticle, research: Research): Promise<Review> {
  // Defensive: humanizer occasionally returns a draft without tags/subtitle on
  // Gemini retries. Don't crash the whole pipeline over a missing field — fall
  // back to safe placeholders so the reviewer can still score the article.
  const safeTitle = draft.title ?? '(no title)';
  const safeSubtitle = draft.subtitle ?? '';
  const safeExcerpt = draft.excerpt ?? '';
  const safeCategory = draft.category ?? 'web';
  const safeTags: string[] = Array.isArray(draft.tags) ? draft.tags : [];
  const safeContent = draft.content ?? '';

  const userPrompt = `Title: ${safeTitle}
Subtitle: ${safeSubtitle}
Excerpt (${safeExcerpt.length} chars): ${safeExcerpt}
Category: ${safeCategory} (allowed: ${CATEGORY_SLUGS.join(', ')})
Tags: ${safeTags.join(', ')}
Word count: ${safeContent.split(/\s+/).length}

Content:
"""
${safeContent}
"""

Original source (for plagiarism comparison):
"""
${research.fullText.slice(0, 2500)}
"""

Score it strictly.`;

  const text = await chat({
    model: MODELS.reviewer,
    system: SYSTEM,
    user: userPrompt,
    maxTokens: 800,
    json: true,
  });

  const parsed = extractJson<Review>(text) ?? { score: 0, verdict: 'reject', reasons: ['Reviewer JSON parse failed'] };
  parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 0)));
  if (!['publish', 'revise', 'reject'].includes(parsed.verdict)) parsed.verdict = 'reject';
  if (!CATEGORY_SLUGS.includes(draft.category)) parsed.verdict = 'reject';

  const localSmell = localAiSmell(draft);
  const localPlag = localPlagiarismRisk(draft, research);
  parsed.aiSmellScore = parsed.aiSmellScore ?? localSmell;
  parsed.plagiarismRisk = parsed.plagiarismRisk ?? localPlag;

  if (localPlag >= 80 || (parsed.plagiarismRisk ?? 0) >= 80) {
    parsed.verdict = 'reject';
    parsed.reasons.push(`Plagiarism risk too high (${parsed.plagiarismRisk}/100)`);
  }
  if ((parsed.factualityScore ?? 100) < 60) {
    parsed.verdict = 'reject';
    parsed.reasons.push(`Factuality too low (${parsed.factualityScore}/100): ${(parsed.factualityIssues ?? []).join('; ')}`);
  }

  return parsed;
}
