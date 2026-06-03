// /api/cron/quality-watch — Quality-Watcher agent HTTP trigger.
//
// Called every 30 min by .github/workflows/quality-watcher.yml (and on
// demand via workflow_dispatch). Runs the audit, emits a Telegram digest
// when something needed action.
//
// Auth via the same public-poke token the writer uses — the watcher itself
// is non-destructive (it only QUEUES work) so abuse exposure is low.

import { NextResponse } from 'next/server';
import { runQualityWatcher } from '@/lib/agents/quality-watcher';

export const dynamic = 'force-dynamic';
// Vercel Pro plan (active 2026-06-03) — quality-watcher does up to 3 LLM
// judge calls per run on gpt-4o-mini; on a slow afternoon that's ~25s.
// 180s leaves margin, matches the cron handler's general policy of 'give
// LLM-driven routes real headroom now that we're not on Hobby anymore'.
export const maxDuration = 180;

const PUBLIC_POKE_TOKEN = 'pk_HxQ7nR9wYzVbpQc4mDjT3eK8aS6vG2fJ_writer_tick';

async function tgInfo(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* best-effort */
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const auth = req.headers.get('authorization');
  const isCronAuth = auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCronAuth && token !== PUBLIC_POKE_TOKEN) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const maxAudits = Math.max(1, Math.min(20, Number(url.searchParams.get('audits') ?? '10')));

  const report = await runQualityWatcher({ maxAudits });

  // Telegram digest only when:
  //   1. Articles were actively flagged for rewrite/polish — operator
  //      action signal.
  //   2. The fleet-wide average word count drops below 1500 (= less than
  //      7.5 min read) — pipeline-quality regression signal.
  const shouldAlert =
    report.rewriteQueued + report.polishQueued > 0 ||
    (report.audited >= 5 && report.avgWords < 1500);

  if (shouldAlert) {
    const lines = [
      `📊 Quality Watcher run`,
      `Audited: ${report.audited}/${report.scanned}`,
      `Avg: ${report.avgWords}w · ${report.avgReadingMin} min · Flesch ${report.avgFlesch}`,
      `Keep: ${report.kept} · Polish queued: ${report.polishQueued} · Rewrite queued: ${report.rewriteQueued}`,
    ];
    const flagged = report.examples.filter((e) => e.verdict !== 'keep');
    if (flagged.length) {
      lines.push('', 'Flagged:');
      for (const f of flagged.slice(0, 5)) {
        lines.push(`• [${f.verdict}] ${f.slug.slice(0, 50)} — ${f.words}w · ${f.readingMin}min · ${f.aiTells} AI-tells`);
      }
    }
    await tgInfo(lines.join('\n'));
  }

  return NextResponse.json({ ok: true, report });
}
