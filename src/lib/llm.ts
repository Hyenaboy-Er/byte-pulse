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

/**
 * Single chat-completion entry point used by every agent. Provider-agnostic.
 * `role` is the agent that's calling, used to pick the right model.
 */
export async function llmChat(opts: {
  role: LLMRole;
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const provider = activeProvider();
  const client = clientFor(provider);
  const model = modelForRole(opts.role);

  // Gemini's OpenAI-compat endpoint accepts `response_format: { type: 'json_object' }`
  // since 2025; DeepSeek does too. OpenAI requires the system prompt to mention "json"
  // when json mode is on — we let callers handle that themselves (existing prompts do).
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
