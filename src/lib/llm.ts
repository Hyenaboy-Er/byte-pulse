// LLM abstraction layer — single chat() function the agents call, with the
// underlying provider chosen by the LLM_PROVIDER env var. All three supported
// providers expose an OpenAI-compatible /chat/completions endpoint, so the
// official `openai` SDK works for every one of them; we just swap baseURL +
// apiKey + model name.
//
//   LLM_PROVIDER=openai      (default, current behavior — uses OPENAI_API_KEY)
//                gemini      (Google Gemini — uses GEMINI_API_KEY, OAI-compat endpoint)
//                deepseek    (DeepSeek — uses DEEPSEEK_API_KEY)
//
// Why this matters: with GPT-4o at $5/M input we burn ~$390-$750/mo at 100 articles/day.
// Gemini 2.5 Flash is ~$0.10/M input ($0.30/M output). Same quality on tech-news
// editing tasks, 25-50x cheaper. DeepSeek V3 is similarly priced and very capable.
//
// Per-role overrides (so writer can use a smarter/bigger model than the reviewer):
//   LLM_WRITER_MODEL=...
//   LLM_HUMANIZER_MODEL=...
//   LLM_REVIEWER_MODEL=...
//   LLM_TRANSLATOR_MODEL=...

import OpenAI from 'openai';

export type LLMRole = 'writer' | 'humanizer' | 'reviewer' | 'translator';
export type LLMProvider = 'openai' | 'gemini' | 'deepseek';

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
          writer:     'gpt-4o',
          humanizer:  'gpt-4o',
          reviewer:   'gpt-4o-mini',
          translator: 'gpt-4o-mini',
        },
      };
    case 'gemini':
      return {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: process.env.GEMINI_API_KEY,
        defaults: {
          // Gemini 2.5 models — Flash is the cost-optimal default; reviewer can stay on it too.
          writer:     'gemini-2.5-flash',
          humanizer:  'gemini-2.5-flash',
          reviewer:   'gemini-2.5-flash-lite',
          translator: 'gemini-2.5-flash-lite',
        },
      };
    case 'deepseek':
      return {
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: process.env.DEEPSEEK_API_KEY,
        defaults: {
          writer:     'deepseek-chat',
          humanizer:  'deepseek-chat',
          reviewer:   'deepseek-chat',
          translator: 'deepseek-chat',
        },
      };
  }
}

function activeProvider(): LLMProvider {
  const raw = (process.env.LLM_PROVIDER ?? 'openai').toLowerCase();
  if (raw === 'gemini' || raw === 'deepseek') return raw;
  return 'openai';
}

// Per-role provider override. Reads LLM_<ROLE>_PROVIDER. Useful for split
// configs like "writer on OpenAI (no reasoning-token waste, fits 5000-token
// budget cleanly) but reviewer/humanizer/translator on Gemini (much cheaper
// for those shorter calls)". Falls back to the global LLM_PROVIDER if unset.
function providerForRole(role: LLMRole): LLMProvider {
  const raw = (process.env[`LLM_${role.toUpperCase()}_PROVIDER`] ?? '').toLowerCase();
  if (raw === 'gemini' || raw === 'deepseek' || raw === 'openai') return raw as LLMProvider;
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
    if (primary !== 'openai' && isRateLimit(err) && process.env.OPENAI_API_KEY) {
      await alertFallback(primary, 'openai');
      return await callProvider('openai', opts);
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
