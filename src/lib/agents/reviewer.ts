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
};

const SYSTEM = `You are the QA + legal editor for an English-language tech magazine. You evaluate article drafts on a 0-100 scale and watch for AI smell, plagiarism, and unsupported claims.

Score SEVEN axes, each 0-100, equally weighted:
1. Headline quality (punchy + honest, 50-75 chars, NOT misleading)
2. Language quality (fluent English, HUMAN sounding — no "furthermore", "in essence", "delve into" etc.)
3. Substance (real editorial take, not just source rehash)
4. Structure (paragraphs, subheadings, bullet list when useful)
5. Fact density (concrete numbers, names from the source)
6. SEO (excerpt 140-160 chars, useful tags, category fit)
7. **Factuality** (CRITICAL): every number/date/claim in the article must be supported by the source. Invented facts = score 0 here AND verdict "reject".

Final score = mean. BUT: if Factuality < 60 → verdict automatically "reject", regardless of the rest.

Also score:
- aiSmellScore (0-100, where 0 = perfectly human, 100 = reeks of AI). > 55 → at minimum "revise".
- plagiarismRisk (0-100, where 0 = safely rewritten, 100 = verbatim copy). > 50 → "reject".

Verdict:
- "publish" if score >= 60 AND no axis < 40 AND aiSmell <= 55 AND plagiarismRisk <= 50
- "revise" if 50-60, or aiSmell 56-70
- "reject" if below 50, OR plagiarismRisk > 50, OR factuality < 60, OR misleading headline

Reply with JSON only:
{
  "score": <0-100>,
  "verdict": "publish" | "revise" | "reject",
  "reasons": ["short, concrete"],
  "fixedTitle": "<optional>",
  "aiSmellScore": <0-100>,
  "plagiarismRisk": <0-100>,
  "factualityScore": <0-100>,
  "factualityIssues": ["if invented facts found, list them"]
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
