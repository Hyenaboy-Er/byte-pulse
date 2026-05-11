// SEO audit endpoint. Run by cron-job.org every 6 hours. Stateful via
// AgentLog: 24h cooldown per issue-class.
import { NextResponse } from 'next/server';
import { runSeoAuditor } from '@/lib/agents/seo-auditor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const report = await runSeoAuditor();
  return NextResponse.json({ ok: true, report });
}
