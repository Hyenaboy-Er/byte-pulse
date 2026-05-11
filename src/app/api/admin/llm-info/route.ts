// Reports which LLM provider + which models the deployed app is actually
// using. Used to verify env-var changes have taken effect after redeploy.
//   GET /api/admin/llm-info?token=$CRON_SECRET

import { NextResponse } from 'next/server';
import { activeProviderName, modelForRole } from '@/lib/llm';

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
    provider: activeProviderName(),
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
