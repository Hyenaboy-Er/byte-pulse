// Homepage-Content-Pipeline — das permanente 3-Agenten-Team.
//
// Anders als die Artikel-Pipeline (Writer→Humanizer→Reviewer im orchestrator.ts)
// ist DIESE Pipeline für die übergeordnete Homepage-Arbeit gedacht: Seitentexte,
// About / Privacy / Editorial-Policy, Landingpage-Copy, SEO-Meta, Hero-Texte.
//
// Drei Rollen, immer automatisch, kein manueller Schritt dazwischen:
//
//   1. LEAD (Generator)   — erzeugt den ersten Entwurf.
//                           Läuft auf dem konfigurierten writer-Provider.
//   2. REVIEWER           — UNABHÄNGIG & STRENG. Hart auf Gemini gepinnt
//                           (llmChatWith('gemini', …)), damit es niemals
//                           "das selbe Modell bewertet sich selbst" wird.
//   3. IMPROVER           — nimmt Entwurf + Review und schreibt die finale,
//                           verbesserte Version. Läuft auf dem writer-Provider.
//
// Ablauf: generate → review → (bei verdict != 'pass') improve → final.
// Alles in EINEM runContentPipeline()-Aufruf — kein Hand-off, keine Wartezeit.
//
// Hinweis zur Unabhängigkeit: echte Cross-Modell-Trennung gibt es nur, wenn der
// Generator NICHT auch Gemini ist. Ideal: LLM_WRITER_PROVIDER=openai (oder
// deepseek) + Reviewer fest Gemini. Ist der Generator selbst Gemini, warnt die
// Pipeline im Log (independenceWeak=true) — sie bricht aber nicht ab.

import { llmChat, llmChatWith, extractJson, activeProviderName } from '../llm';
import { prisma } from '../db';
import { SITE } from '../site';

// Marken-Stimme — single source, geht in jeden Lead/Improver-Prompt.
const BRAND_VOICE =
  `${SITE.name} — English-language tech magazine (AI, gaming, hardware, mobile, ` +
  `software, security, crypto, science, EV, web). Voice: clear, punchy, ` +
  `international, concrete. NO filler ("in today's fast-paced world"), NO ` +
  `clichés ("game-changer", "delve into"), NO hype. Plain, confident, factual.`;

export type ContentKind =
  | 'landing' | 'about' | 'privacy' | 'editorial-policy'
  | 'seo-meta' | 'hero' | 'newsletter-copy' | 'free-text';

export type ContentJob = {
  kind: ContentKind;
  brief: string;           // was genau erzeugt werden soll
  context?: string;        // optional: bestehender Text, Constraints, Fakten
};

export type ReviewVerdict = 'pass' | 'revise' | 'reject';

export type ContentReview = {
  verdict: ReviewVerdict;
  score: number;           // 0-100
  issues: string[];        // konkrete Schwächen
  strengths: string[];     // was gut ist (vom Improver zu erhalten)
};

export type PipelineResult = {
  kind: ContentKind;
  draft: string;           // Stufe 1
  review: ContentReview;   // Stufe 2
  final: string;           // Stufe 3 (== draft wenn review schon 'pass')
  improved: boolean;
  independenceWeak: boolean; // true wenn Generator == Reviewer-Provider (Gemini)
  ms: number;
};

// ── Stufe 1: LEAD / Generator ──────────────────────────────────────────────
async function generate(job: ContentJob): Promise<string> {
  return llmChat({
    role: 'writer',
    system:
      `You are the lead content writer for ${BRAND_VOICE}\n\n` +
      `Produce PRODUCTION-READY ${job.kind} content. It must be publishable as-is: ` +
      `correct, on-brand, complete. Output ONLY the content itself — no preamble, ` +
      `no "here is", no markdown fences unless the content type needs markdown.`,
    user:
      `Brief:\n${job.brief}\n\n` +
      (job.context ? `Context / constraints / facts you MUST respect:\n${job.context}` : ''),
    maxTokens: 2600,
    temperature: 0.7,
  });
}

// ── Stufe 2: REVIEWER (unabhängig, streng, IMMER Gemini) ───────────────────
async function review(job: ContentJob, draft: string): Promise<ContentReview> {
  const raw = await llmChatWith('gemini', {
    role: 'reviewer',
    system:
      `You are a STRICT, INDEPENDENT content reviewer. You did NOT write this ` +
      `draft and you owe its author nothing. Your only loyalty is to quality.\n\n` +
      `Hunt for EVERY weakness: factual risk or unverifiable claims, off-brand or ` +
      `hyped tone, filler and repetition, weak structure, SEO gaps (thin meta, ` +
      `missing keywords, weak headline), clarity problems, legal/compliance gaps ` +
      `for legal pages, anything that would embarrass the brand.\n\n` +
      `Be harsh. verdict="pass" ONLY if you would ship it UNCHANGED right now. ` +
      `If you can name even one real improvement, it is "revise". "reject" means ` +
      `fundamentally wrong and needs a rewrite.\n\n` +
      `Return STRICT JSON, nothing else:\n` +
      `{ "verdict": "pass"|"revise"|"reject", "score": <0-100>, ` +
      `"issues": ["concrete, actionable problem", ...], ` +
      `"strengths": ["what works and must be kept", ...] }`,
    user:
      `Content type: ${job.kind}\nBrief the writer was given:\n${job.brief}\n\n` +
      `DRAFT TO REVIEW:\n"""\n${draft}\n"""`,
    maxTokens: 1400,
    json: true,
    temperature: 0.25,
  });

  const parsed = extractJson<ContentReview>(raw);
  if (!parsed || !parsed.verdict) {
    // Reviewer-Output unbrauchbar → sicherheitshalber 'revise', damit der
    // Improver trotzdem läuft (lieber eine Runde zu viel als ungeprüft raus).
    return {
      verdict: 'revise',
      score: 50,
      issues: ['Reviewer returned unparseable output — forcing one improve pass.'],
      strengths: [],
    };
  }
  return {
    verdict: parsed.verdict,
    score: typeof parsed.score === 'number' ? parsed.score : 50,
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
  };
}

// ── Stufe 3: IMPROVER ──────────────────────────────────────────────────────
async function improve(job: ContentJob, draft: string, rev: ContentReview): Promise<string> {
  return llmChat({
    role: 'writer',
    system:
      `You are the lead writer producing the FINAL version of ${job.kind} content ` +
      `for ${BRAND_VOICE}\n\n` +
      `An independent reviewer critiqued the draft. Fix EVERY issue they raised. ` +
      `Keep every strength they named. Do not introduce new problems. ` +
      `Output ONLY the final content — no commentary, no "here is the improved".`,
    user:
      `Brief:\n${job.brief}\n\n` +
      `ORIGINAL DRAFT:\n"""\n${draft}\n"""\n\n` +
      `REVIEWER — ISSUES TO FIX:\n` +
      (rev.issues.length ? rev.issues.map((s, i) => `${i + 1}. ${s}`).join('\n') : '(none listed)') +
      `\n\nREVIEWER — STRENGTHS TO KEEP:\n` +
      (rev.strengths.length ? rev.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n') : '(none listed)'),
    maxTokens: 2600,
    temperature: 0.6,
  });
}

/**
 * Das permanente 3-Agenten-Team in einem Aufruf:
 *   generate → review (Gemini, unabhängig) → improve → final.
 * Kein manueller Schritt, kein Hand-off. Loggt jeden Lauf in AgentLog.
 */
export async function runContentPipeline(job: ContentJob): Promise<PipelineResult> {
  const t0 = Date.now();

  // 1. LEAD generiert
  const draft = await generate(job);

  // 2. REVIEWER (immer Gemini) prüft unabhängig
  const rev = await review(job, draft);

  // 3. IMPROVER verbessert — nur wenn nicht schon 'pass'
  let final = draft;
  let improved = false;
  if (rev.verdict !== 'pass') {
    final = await improve(job, draft, rev);
    improved = true;
  }

  // Generator und Reviewer im selben Modell-Haus? Dann ist die Unabhängigkeit
  // schwächer — der Reviewer ist hart Gemini, also tritt das nur ein, wenn der
  // Generator ebenfalls auf Gemini läuft.
  const independenceWeak = activeProviderName() === 'gemini';

  const ms = Date.now() - t0;

  await prisma.agentLog.create({
    data: {
      agent: 'content-pipeline',
      action: job.kind,
      status: rev.verdict === 'reject' ? 'warn' : 'success',
      message:
        `verdict=${rev.verdict} score=${rev.score} improved=${improved} ` +
        `${ms}ms${independenceWeak ? ' WARN:generator==gemini(weak-independence)' : ''}`,
      meta: JSON.stringify({ issues: rev.issues, strengths: rev.strengths }),
    },
  }).catch(() => null);

  return { kind: job.kind, draft, review: rev, final, improved, independenceWeak, ms };
}
