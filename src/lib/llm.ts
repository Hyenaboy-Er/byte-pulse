// LLM abstraction layer — single chat() function the agents call, with the
// underlying provider chosen by the LLM_PROVIDER env var. All three supported
// providers expose an OpenAI-compatible /chat/completions endpoint, so the
// official `openai` SDK works for every one of them; we just swap baseURL +
// apiKey + model name.
//
//   LLM_PROVIDER=openai      (default, current behavior — uses OPENAI_API_KEY)
//                gemini      (Google Gemini — uses GEMINI_API_KEY, OAI-compat endpoint)
//                deepseek    (DeepSeek — uses DEEPSEEK_API_KEY)
//                groq        (Groq Cloud — uses GROQ_API_KEY, FREE TIER with
//                             Llama 3.3 70B + Llama 4 Scout/Maverick. OpenAI-
//                             compatible API at api.groq.com/openai/v1)
//
// Why this matters: with GPT-4o at $5/M input we burn ~$390-$750/mo at 100 articles/day.
// Gemini 2.5 Flash is ~$0.10/M input ($0.30/M output). Same quality on tech-news
// editing tasks, 25-50x cheaper. DeepSeek V3 is similarly priced and very capable.
// Groq Free is $0/M — fastest inference on the market (10x typical latency).
//
// Per-role overrides (so writer can use a smarter/bigger model than the reviewer):
//   LLM_WRITER_MODEL=...
//   LLM_HUMANIZER_MODEL=...
//   LLM_REVIEWER_MODEL=...
//   LLM_TRANSLATOR_MODEL=...

import OpenAI from 'openai';

// LLM roles. The first four are the legacy single-pass roles; the four
// 'persona-…' roles below back the Multi-Agent newsroom pipeline (Drafter
// → Editor → FactChecker → Polisher). Splitting them lets each persona
// use the model that's best for its job:
//   - 'persona-drafter'     long-form creative depth → Gemini 2.5 Pro
//   - 'persona-editor'      surgical structured cut → Gemini 2.5 Flash
//   - 'persona-factchecker' independent verification → Groq Llama 3.3 70B
//   - 'persona-polisher'    targeted polish + AI-tell removal → Gemini 2.5 Flash
// Each falls back to 'writer' / 'reviewer' if no provider-specific default
// is set, so old configs keep working.
export type LLMRole =
  | 'writer'
  | 'humanizer'
  | 'reviewer'
  | 'translator'
  | 'persona-drafter'
  | 'persona-editor'
  | 'persona-factchecker'
  | 'persona-polisher';
export type LLMProvider = 'openai' | 'gemini' | 'deepseek' | 'groq' | 'ollama';

type ProviderConfig = {
  baseURL?: string;
  apiKey: string | undefined;
  defaults: Record<LLMRole, string>;
};

function providerConfig(p: LLMProvider): ProviderConfig {
  switch (p) {
    case 'openai':
      return {
        apiKey: process.env.OPENAI_API_KEY,
        defaults: {
          // All four personas on gpt-4o-mini because gpt-4o is too slow
          // for the Vercel hobby 60s function ceiling once you chain
          // Drafter → Editor → FactCheck → Polisher in one HTTP request
          // (live test 2026-06-03: 504 FUNCTION_INVOCATION_TIMEOUT).
          //
          // gpt-4o-mini: ~200 tok/s, 4o: ~50 tok/s. With 4 stages × ~5k
          // tokens out each, mini fits in ~35s; 4o blows past 90s.
          //
          // Quality on tech-news long-form is ~88% of 4o per our blind
          // test eval and stays well above Gemini Flash. To get full 4o
          // back, either:
          //   - upgrade Vercel to Pro (900s function timeout, $20/mo)
          //   - move pipeline to background jobs (more rework)
          //   - or set LLM_PERSONA-DRAFTER_MODEL=gpt-4o explicitly and
          //     accept that some runs will 504.
          writer:                'gpt-4o-mini',
          humanizer:             'gpt-4o-mini',
          reviewer:              'gpt-4o-mini',
          translator:            'gpt-4o-mini',
          'persona-drafter':     'gpt-4o-mini',
          'persona-editor':      'gpt-4o-mini',
          'persona-factchecker': 'gpt-4o-mini',
          'persona-polisher':    'gpt-4o-mini',
        },
      };
    case 'gemini':
      return {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: process.env.GEMINI_API_KEY,
        defaults: {
          writer:                'gemini-2.5-flash',
          humanizer:             'gemini-2.5-flash',
          reviewer:              'gemini-2.5-flash-lite',
          translator:            'gemini-2.5-flash-lite',
          // Drafter was briefly on gemini-2.5-pro for max long-form
          // quality, but the free tier is throttled to ~5 RPM / 25 RPD
          // which gets hammered by our 4-parallel cron stack (429 within
          // seconds). Flash gives ~95% of Pro's quality on long-form
          // tech-news + has 1500 RPD = stable. Cross-family verification
          // for the FactChecker is the remaining diversity lever; set
          // LLM_PERSONA-FACTCHECKER_PROVIDER=groq in env to activate.
          'persona-drafter':     'gemini-2.5-flash',
          'persona-editor':      'gemini-2.5-flash',
          'persona-factchecker': 'gemini-2.5-flash',
          'persona-polisher':    'gemini-2.5-flash',
        },
      };
    case 'deepseek':
      return {
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: process.env.DEEPSEEK_API_KEY,
        defaults: {
          writer:                'deepseek-chat',
          humanizer:             'deepseek-chat',
          reviewer:              'deepseek-chat',
          translator:            'deepseek-chat',
          'persona-drafter':     'deepseek-chat',
          'persona-editor':      'deepseek-chat',
          'persona-factchecker': 'deepseek-chat',
          'persona-polisher':    'deepseek-chat',
        },
      };
    case 'groq':
      return {
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        defaults: {
          writer:                'llama-3.3-70b-versatile',
          humanizer:             'llama-3.3-70b-versatile',
          reviewer:              'llama-3.1-8b-instant',
          translator:            'llama-3.1-8b-instant',
          'persona-drafter':     'llama-3.3-70b-versatile',
          'persona-editor':      'llama-3.3-70b-versatile',
          // Groq Llama 70B for fact-checking — independent model family
          // from Gemini, so verification finds different errors than
          // 'same-model checks same-model' would. Free tier ~10k req/day.
          'persona-factchecker': 'llama-3.3-70b-versatile',
          'persona-polisher':    'llama-3.1-8b-instant',
        },
      };
    case 'ollama':
      // Local-only — set OLLAMA_BASE_URL=http://127.0.0.1:11434/v1 when
      // running on the same machine as the Ollama server, or point it
      // at a Cloudflare-tunnel'd public hostname. Ollama serves an OpenAI-
      // compatible /v1/chat/completions endpoint out of the box.
      // The OpenAI SDK requires apiKey to be a non-empty string even when
      // the upstream ignores it — Ollama doesn't check it.
      return {
        baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
        apiKey: process.env.OLLAMA_API_KEY || 'ollama-no-auth',
        defaults: {
          writer:                process.env.OLLAMA_MODEL || 'gemma4:e4b',
          humanizer:             process.env.OLLAMA_MODEL || 'gemma4:e4b',
          reviewer:              process.env.OLLAMA_MODEL || 'gemma4:e4b',
          translator:            process.env.OLLAMA_MODEL || 'gemma4:e4b',
          'persona-drafter':     process.env.OLLAMA_MODEL || 'gemma4:e4b',
          'persona-editor':      process.env.OLLAMA_MODEL || 'gemma4:e4b',
          'persona-factchecker': process.env.OLLAMA_MODEL || 'gemma4:e4b',
          'persona-polisher':    process.env.OLLAMA_MODEL || 'gemma4:e4b',
        },
      };
  }
}

function activeProvider(): LLMProvider {
  const raw = (process.env.LLM_PROVIDER ?? 'openai').toLowerCase();
  if (raw === 'gemini' || raw === 'deepseek' || raw === 'groq' || raw === 'ollama') return raw as LLMProvider;
  return 'openai';
}

// Per-role provider override. Reads LLM_<ROLE>_PROVIDER. Useful for split
// configs like "writer on OpenAI (no reasoning-token waste, fits 5000-token
// budget cleanly) but reviewer/humanizer/translator on Gemini (much cheaper
// for those shorter calls)". Falls back to the global LLM_PROVIDER if unset.
function providerForRole(role: LLMRole): LLMProvider {
  const raw = (process.env[`LLM_${role.toUpperCase()}_PROVIDER`] ?? '').toLowerCase();
  if (raw === 'gemini' || raw === 'deepseek' || raw === 'openai' || raw === 'groq' || raw === 'ollama') return raw as LLMProvider;
  return activeProvider();
}

const clientCache: Partial<Record<LLMProvider, OpenAI>> = {};

function clientFor(p: LLMProvider): OpenAI {
  if (clientCache[p]) return clientCache[p]!;
  const cfg = providerConfig(p);
  if (!cfg.apiKey) {
    throw new Error(
      `LLM provider "${p}" selected but API key is missing. ` +
      `Set ${p === 'openai' ? 'OPENAI_API_KEY' : p === 'gemini' ? 'GEMINI_API_KEY' : 'DEEPSEEK_API_KEY'}.`
    );
  }
  const c = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  clientCache[p] = c;
  return c;
}

/**
 * Resolve the model name for a given role. Order of precedence:
 *   1. LLM_<ROLE>_MODEL env var (explicit override)
 *   2. The active provider's default for that role
 */
export function modelForRole(role: LLMRole): string {
  const envOverride = process.env[`LLM_${role.toUpperCase()}_MODEL`];
  if (envOverride && envOverride.length > 0) return envOverride;
  return providerConfig(activeProvider()).defaults[role];
}

// Rate-limit / quota error detection. Gemini free tier throws 429 with empty
// body after 10 RPM or 250 RPD; OpenAI throws 429 after monthly quota; DeepSeek
// returns 429 on burst. All three surface as { status: 429 } from the openai SDK.
function isRateLimit(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; code?: string; message?: string };
  if (e.status === 429) return true;
  if (e.code === 'rate_limit_exceeded' || e.code === 'insufficient_quota') return true;
  const msg = (e.message ?? '').toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('quota');
}

// Track when we last warned about a provider so the Telegram channel doesn't
// drown in alerts when every request in a cron run trips the same limit.
const lastFallbackAlert: Partial<Record<LLMProvider, number>> = {};
async function alertFallback(from: LLMProvider, to: LLMProvider) {
  const now = Date.now();
  if ((lastFallbackAlert[from] ?? 0) > now - 30 * 60 * 1000) return; // 30 min cooldown
  lastFallbackAlert[from] = now;
  // Lazy-load to avoid circular deps
  try {
    const { tgWarn } = await import('./telegram');
    await tgWarn(`LLM provider ${from} hit rate limit / quota — falling back to ${to}. ` +
      (from === 'gemini'
        ? 'Enable billing at https://aistudio.google.com/api-keys → Abrechnung einrichten to lift free-tier limits (still ~12 $/month total at our volume).'
        : 'Top up the provider account or change LLM_PROVIDER.'));
  } catch {}
}

async function callProvider(p: LLMProvider, opts: {
  role: LLMRole;
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const client = clientFor(p);
  const cfg = providerConfig(p);
  const envOverride = process.env[`LLM_${opts.role.toUpperCase()}_MODEL`];
  const model = envOverride && envOverride.length > 0 ? envOverride : cfg.defaults[opts.role];
  const res = await client.chat.completions.create({
    model,
    max_tokens: opts.maxTokens ?? 2000,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    response_format: opts.json ? { type: 'json_object' } : undefined,
    temperature: opts.temperature ?? 0.7,
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}

/**
 * Single chat-completion entry point used by every agent. Provider-agnostic
 * with automatic OpenAI fallback on rate-limit / quota errors so the publish
 * pipeline survives Gemini free-tier throttling without operator intervention.
 *
 * Fallback rule: ANY non-OpenAI provider that throws a 429 / quota error
 * automatically retries through OpenAI (if OPENAI_API_KEY is set). A
 * rate-limited Telegram alert fires the first time fallback triggers per
 * 30-minute window so the operator knows to enable provider billing.
 */
// Free-tier fallback chain: if the primary provider 429s, walk through any
// other configured free-tier providers before giving up. Each one has its
// own daily-token bucket that resets at a different moment of the day, so
// one bucket being empty doesn't take the whole pipeline down.
function freeFallbackChain(primary: LLMProvider): LLMProvider[] {
  const chain: LLMProvider[] = [];
  // Most pragmatic order: Gemini and Groq are roughly interchangeable for
  // quality on this workload. Whichever isn't primary goes next.
  for (const cand of ['gemini', 'groq', 'deepseek'] as LLMProvider[]) {
    if (cand !== primary && providerConfig(cand).apiKey) chain.push(cand);
  }
  return chain;
}

export async function llmChat(opts: {
  role: LLMRole;
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const primary = providerForRole(opts.role);
  try {
    return await callProvider(primary, opts);
  } catch (err) {
    if (isRateLimit(err)) {
      // Try every other configured free-tier provider in order.
      for (const next of freeFallbackChain(primary)) {
        try {
          await alertFallback(primary, next);
          return await callProvider(next, opts);
        } catch (e2) {
          if (!isRateLimit(e2)) throw e2;
          // next provider also rate-limited — keep walking the chain.
        }
      }
      // Last-resort OpenAI fallback (opt-in, costs real money).
      if (process.env.LLM_OPENAI_FALLBACK === '1' && primary !== 'openai' && process.env.OPENAI_API_KEY) {
        await alertFallback(primary, 'openai');
        return await callProvider('openai', opts);
      }
    }
    throw err;
  }
}

/**
 * Force a chat completion through a SPECIFIC provider, bypassing LLM_PROVIDER
 * and the per-role config entirely. Used by the homepage content pipeline so
 * the Reviewer ALWAYS runs on Gemini — cross-model independence must be a hard
 * guarantee, not something an env var could silently drift away from.
 * Throws a clear error if that provider's API key is missing.
 */
export async function llmChatWith(provider: LLMProvider, opts: {
  role: LLMRole;
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  return callProvider(provider, opts);
}

export function extractJson<T = unknown>(text: string): T | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export function activeProviderName(): LLMProvider {
  return activeProvider();
}
