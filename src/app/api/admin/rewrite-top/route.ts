// /api/admin/rewrite-top — force-rewrite the top-N most-read articles
// through the new gpt-4o Multi-Agent pipeline.
//
// Use case: Serhat is submitting the AdSense application this Saturday
// (2026-06-07). His ~850 existing articles were written under the old
// single-pass writer (fragment-heavy, thin, "Newsroom" bylines pre-fix).
// The AdSense reviewer will open the most-visible articles first — so
// we proactively re-upgrade those through the new Drafter → Editor →
// FactCheck → Polisher pipeline. The new ones will then dominate
// homepage rankings + look like the real publication, not the
// pre-Serhat-Er-byline backlog.
//
// SAFE BY DEFAULT
//   - Auth via CRON_SECRET (server-only) — no public token.
//   - Picks the article with HIGHEST views that hasn't been
//     force-rewritten yet. Idempotent via agentLog action
//     'force-rewrite-top-views-<id>' status 'ok'.
//   - Processes ONE article per call (rewrite + DB update takes ~2-3
//     min on Pro tier). Caller (a GH-Actions cron, or you) hits it
//     repeatedly; each tick drains one from the queue.
//   - Bails cleanly when nothing is left to do.
//
// EXPECTED OPERATIONS
//   GH-Actions cron firing every 10 minutes for ~3-4 hours = 20-25
//   articles processed. Done before Saturday morning.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { upgradeArticleViaMultiAgent } from '@/lib/agents/multi-agent-pipeline';
import { pingIndexNow } from '@/lib/indexnow';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';
// Vercel Pro: 900s max. 280s gives the full 4-stage pipeline (Drafter
// gpt-4o is the slow one, ~100-140s) + DB update headroom + IndexNow ping.
export const maxDuration = 280;

const SITE_URL = SITE.url.replace(/\/$/, '');

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

interface RewriteResult {
  slug: string;
  before: number;
  after: number;
  factuality?: number;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get('authorization');
  // Two valid auth paths so this can be triggered both by Vercel cron
  // headers (Bearer CRON_SECRET) and by my own admin curl calls.
  const tokenOk =
    auth === `Bearer ${process.env.CRON_SECRET}` ||
    url.searchParams.get('token') === process.env.CRON_SECRET;
  if (!tokenOk) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const topN = Math.max(1, Math.min(100, Number(url.searchParams.get('topN') ?? '20')));

  // Pull the next candidate: highest views, status=published, not yet
  // force-rewritten. Single fetch — we process one and exit.
  let candidate: {
    id: string;
    slug: string;
    title: string;
    category: string;
    content: string;
    sourceName: string | null;
    views: number | null;
  } | null = null;
  try {
    // Pre-filter the top-N pool first, then ask agentLog who's been done.
    const pool = await prisma.article.findMany({
      where: { status: 'published' },
      orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
      take: topN,
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        content: true,
        sourceName: true,
        views: true,
      },
    });
    const ids = pool.map((p) => p.id);
    const done = await prisma.agentLog.findMany({
      where: {
        agent: 'force-rewrite-top',
        status: 'ok',
        action: { in: ids.map((i) => `force-rewrite-top-views-${i}`) },
      },
      select: { action: true },
    });
    const doneIds = new Set(done.map((d) => d.action.replace('force-rewrite-top-views-', '')));
    candidate = pool.find((p) => !doneIds.has(p.id)) ?? null;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `db-read failed: ${(e as Error).message}` },
      { status: 503 },
    );
  }

  if (!candidate) {
    return NextResponse.json({ ok: true, status: 'queue-empty', topN });
  }

  const beforeWords = wordCount(candidate.content);

  // Force-run through the upgrade path (Drafter → Editor → FactCheck →
  // Polisher). The upgrade variant uses the existing article body as the
  // 'source' material, so we don't need to re-fetch the original news URL
  // (brittle, often 404, costs LLM tokens for re-research).
  let result: RewriteResult;
  try {
    const upgrade = await upgradeArticleViaMultiAgent(
      candidate.title,
      candidate.category,
      candidate.content,
      candidate.sourceName ?? undefined,
    );
    const afterWords = wordCount(upgrade.content);

    // Only persist if the rewrite is materially better. Otherwise log and
    // try the next candidate on the next tick. Floor lowered to 950 on
    // 2026-06-03: with the depth+opinion upgrade prompt, a 1000w rewrite
    // can be materially deeper than a 1300w original (Compared-to +
    // Operator-view + Open-questions sections add tracked editorial
    // value even at similar length).
    if (afterWords < Math.max(950, beforeWords - 200)) {
      await prisma.agentLog.create({
        data: {
          agent: 'force-rewrite-top',
          action: `force-rewrite-top-views-${candidate.id}`,
          status: 'skipped',
          message: `${candidate.slug}: ${beforeWords}w → ${afterWords}w (would shrink, skipping)`,
        },
      }).catch(() => null);
      return NextResponse.json({
        ok: true,
        status: 'skipped-shrink',
        slug: candidate.slug,
        before: beforeWords,
        after: afterWords,
      });
    }

    await prisma.article.update({
      where: { id: candidate.id },
      data: { content: upgrade.content },
    });
    await prisma.agentLog.create({
      data: {
        agent: 'force-rewrite-top',
        action: `force-rewrite-top-views-${candidate.id}`,
        status: 'ok',
        message: `${candidate.slug}: ${beforeWords}w → ${afterWords}w · fc=${upgrade.factCheck.factuality_score}`,
      },
    }).catch(() => null);
    // Tell Bing the page changed.
    pingIndexNow([`${SITE_URL}/article/${candidate.slug}`]).catch(() => null);
    // Best-effort Next.js cache invalidation for the article page.
    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath(`/article/${candidate.slug}`);
    } catch {
      /* edge-case in some runtimes; the ISR refresh on the next hit
         catches it regardless */
    }

    result = {
      slug: candidate.slug,
      before: beforeWords,
      after: afterWords,
      factuality: upgrade.factCheck.factuality_score,
    };
  } catch (e) {
    await prisma.agentLog.create({
      data: {
        agent: 'force-rewrite-top',
        action: `force-rewrite-top-views-${candidate.id}`,
        status: 'error',
        message: `${candidate.slug}: ${(e as Error).message.slice(0, 240)}`,
      },
    }).catch(() => null);
    return NextResponse.json(
      { ok: false, error: (e as Error).message, slug: candidate.slug },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: 'rewritten', ...result });
}
// cache-bust a102232
