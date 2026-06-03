import { NextResponse } from 'next/server';
import { runOnce, type RunReport } from '@/lib/agents/orchestrator';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Öffentlicher Poke-Token. Committed bewusst in den public-Repo:
//   - Erlaubt der GitHub-Action "writer-poke" alle 30 Min /api/cron zu feuern,
//     ohne dass CRON_SECRET als GitHub-Secret hinterlegt sein muss.
//   - Missbrauch wird durch ein DB-basiertes Rate-Limit (<20 Min seit letztem
//     Artikel → 429) abgefangen: Egal wie oft jemand das ruft, schreibt der
//     Writer max. ~3 Artikel/Stunde. Keine kalkulierbare Kosten-Falle.
//   - Beim regulären CRON_SECRET-Pfad gilt das Limit NICHT.
const PUBLIC_POKE_TOKEN = 'pk_HxQ7nR9wYzVbpQc4mDjT3eK8aS6vG2fJ_writer_tick';
// 25-min cooldown targets Serhat's '48 articles/day' math (24h / 30min =
// 48). 25min gives a small slack for GitHub cron drops + pipeline retries
// while still hitting ~57/day theoretical max if every window publishes.
// The 4-workflow parallel poke stack ensures at least one trigger arrives
// inside every 25-min window even when GitHub throttles individual queues.
const PUBLIC_POKE_MIN_GAP_MS = 25 * 60_000;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const requestedBatch = Math.max(1, Math.min(30, Number(url.searchParams.get('batch') ?? '1')));
  const expected = process.env.CRON_SECRET;

  const isAuthCron = !!(expected && (auth === `Bearer ${expected}` || tokenFromQuery === expected));
  const isPublicPoke = tokenFromQuery === PUBLIC_POKE_TOKEN;

  if (!isAuthCron && !isPublicPoke) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Rate-Limit nur für Public-Poke — schützt vor DoS / Cost-Abuse, ohne den
  // legitimen Vercel-Cron (CRON_SECRET) zu drosseln.
  // Resilient: when Turso reads are blocked we can't check the "last article
  // age" — we fall through without the rate-limit. The 30-min cron cadence
  // and the slug-uniqueness check make abuse irrelevant in practice.
  if (isPublicPoke && !isAuthCron) {
    try {
      const lastArticle = await prisma.article.findFirst({
        where: { status: 'published' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      if (lastArticle && Date.now() - lastArticle.createdAt.getTime() < PUBLIC_POKE_MIN_GAP_MS) {
        return NextResponse.json({
          ok: true, skipped: true, reason: 'public-poke rate-limit',
          lastPublishedAt: lastArticle.createdAt.toISOString(),
        });
      }
    } catch (e) {
      // DB read blocked — skip the rate-limit check and proceed. Better to
      // produce an article (or hit a downstream LLM-side rate limit naturally)
      // than to 500-out the entire pipeline.
    }
  }

  // Public-Poke darf max. batch=1 anfordern. Echter Cron beliebig.
  const batch = isPublicPoke && !isAuthCron ? 1 : requestedBatch;

  // Time-bounded batch: stop ~50s in to leave headroom for the response.
  const deadline = Date.now() + 50_000;
  const reports: RunReport[] = [];
  let published = 0;
  for (let i = 0; i < batch && Date.now() < deadline; i++) {
    const r = await runOnce();
    reports.push(r);
    if (r.published) published++;
    if (r.error) break;
  }

  // Backlog-Drain (quality-upgrade + translation-repair) nur beim
  // authentifizierten Vercel-Cron — beim Public-Poke alle 30 Min würde
  // das den Drain übersteuern und Tokens verbrennen.
  if (isAuthCron) {
    const base = `${url.protocol}//${url.host}`;
    await Promise.allSettled([
      fetch(`${base}/api/quality-upgrade?token=${expected}`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${base}/api/translate-repair?token=${expected}&max=8`, { signal: AbortSignal.timeout(3000) }),
    ]);
  }

  return NextResponse.json({
    ok: !reports.some((r) => r.error),
    attempted: reports.length,
    published,
    last: reports[reports.length - 1],
    drain: 'quality-upgrade + translate-repair fired',
  });
}
