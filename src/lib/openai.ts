// Compatibility shim — agents historically import { chat, MODELS, extractJson }
// from this file. The actual implementation now lives in src/lib/llm.ts and
// supports OpenAI, Gemini, and DeepSeek. We forward calls and translate the old
// model-string API (MODELS.writer etc.) into the role-based llmChat API so no
// agent had to change.
//
// New agents should import from '@/lib/llm' directly.

import { llmChat, extractJson as extractJsonLLM, type LLMRole, modelForRole } from './llm';

export { extractJsonLLM as extractJson };

// Legacy MODELS export — kept so existing import lines still resolve. The
// strings are advisory; the real model used at runtime is decided by the
// active LLM_PROVIDER + LLM_<ROLE>_MODEL env vars.
export const MODELS = {
  writer:    'writer',
  humanizer: 'humanizer',
  reviewer:  'reviewer',
  translator: 'translator',
  image:     'dall-e-3',
} as const;

const MODEL_TO_ROLE: Record<string, LLMRole | null> = {
  'writer':     'writer',
  'humanizer':  'humanizer',
  'reviewer':   'reviewer',
  'translator': 'translator',
  // Real OpenAI model names from older callers — map them to the closest role
  // so they still flow through the provider abstraction.
  'gpt-4o':         'writer',
  'gpt-4o-mini':    'reviewer',
  'gpt-4-turbo':    'writer',
  'gpt-3.5-turbo':  'reviewer',
};

function roleFromModel(model: string): LLMRole {
  return MODEL_TO_ROLE[model] ?? 'writer';
}

export async function chat(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const role = roleFromModel(opts.model);
  return llmChat({
    role,
    system: opts.system,
    user: opts.user,
    maxTokens: opts.maxTokens,
    json: opts.json,
    temperature: opts.temperature,
  });
}

// Some legacy code paths may still call ai() to access raw OpenAI client (e.g.
// for image generation). Keep a thin instantiation so they don't break — but
// only when OPENAI_API_KEY is set.
import OpenAI from 'openai';
let legacyClient: OpenAI | null = null;
export function ai(): OpenAI {
  if (!legacyClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY missing. Image generation requires OpenAI even when LLM_PROVIDER is set to Gemini/DeepSeek.');
    }
    legacyClient = new OpenAI({ apiKey });
  }
  return legacyClient;
}

// Convenience helper so /api/admin/* etc. can show which provider is live.
export { modelForRole };
export { activeProviderName } from './llm';
