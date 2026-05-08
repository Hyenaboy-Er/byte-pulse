import OpenAI from 'openai';

let client: OpenAI | null = null;

export function ai(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY fehlt in .env. Trag den Key ein, dann starten die Agenten.');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const MODELS = {
  writer:    'gpt-4o',
  humanizer: 'gpt-4o',
  reviewer:  'gpt-4o-mini',
  image:     'dall-e-3',
} as const;

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

export async function chat(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
}): Promise<string> {
  const res = await ai().chat.completions.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2000,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    response_format: opts.json ? { type: 'json_object' } : undefined,
    temperature: 0.7,
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}
