// Reports which LLM provider + which models the deployed app is actually
// using. Used to verify env-var changes have taken effect after redeploy.
//   GET /api/admin/llm-info?token=$CRON_SECRET

import { NextResponse } from 'next/server';
import { activeProviderName, modelForRole } from '@/lib/llm';

const ROLE_PROVIDER_ENVS: Record<string, string> = {
  writer: 'LLM_WRITER_PROVIDER',
  humanizer: 'LLM_HUMANIZER_PROVIDER',
  reviewer: 'LLM_REVIEWER_PROVIDER',
  translator: 'LLM_TRANSLATOR_PROVIDER',
};

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    defaultProvider: activeProviderName(),
    perRoleProvider: {
      writer: process.env.LLM_WRITER_PROVIDER || `(default: ${activeProviderName()})`,
      humanizer: process.env.LLM_HUMANIZER_PROVIDER || `(default: ${activeProviderName()})`,
      reviewer: process.env.LLM_REVIEWER_PROVIDER || `(default: ${activeProviderName()})`,
      translator: process.env.LLM_TRANSLATOR_PROVIDER || `(default: ${activeProviderName()})`,
    },
    keys: {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
    },
    models: {
      writer:     modelForRole('writer'),
      humanizer:  modelForRole('humanizer'),
      reviewer:   modelForRole('reviewer'),
      translator: modelForRole('translator'),
    },
  });
}

void ROLE_PROVIDER_ENVS;
