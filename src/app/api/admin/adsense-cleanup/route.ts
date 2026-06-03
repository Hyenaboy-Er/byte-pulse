// /api/admin/adsense-cleanup — archive the long tail of low-view articles
// so the AdSense reviewer sees a focused, high-quality magazine rather
// than 850 articles published in 3 weeks (which reads as automation flag).
//
// LOGIC
//   - Keep top N (default 250) articles by views, status='published'
//   - Bottom rest → status='archived'
//   - status='archived' is already excluded from homepage, sitemap.xml,
//     category pages, search (see prisma queries everywhere using
//     status: 'published').
//   - Articles stay reachable at /article/<slug> for any externally
//     linked traffic, but the magazine front-door volume drops to a
//     defensible 250 in 3 weeks (= ~12/day, plausible for a multi-agent
//     AI-augmented newsroom with an editor-in-chief).
//
// SAFE TO RE-RUN: idempotent — re-archives what should be archived,
// re-publishes nothing automatically. To restore an article, use
// /api/admin/unpublish with reverse logic via Prisma directly.
//
// AUTH: Bearer CRON_SECRET or ?token=
//
// CALL:
//   curl -X POST 'https://www.byte-pulse.net/api/admin/adsense-cleanup?keep=250' \
//     -H 'Authorization: Bearer <CRON_SECRET>'
//
// RESPONSE:
//   { ok, kept, archived, threshold_views, sampleArchived: [...] }

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (
    !expected ||
    (auth !== `Bearer ${expected}` && url.searchParams.get('token') !== expected)
  ) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const keep = Math.max(50, Math.min(1000, Number(url.searchParams.get('keep') ?? '250')));
  const dryRun = url.searchParams.get('dryRun') === '1';

  // Get all published articles, sort by views DESC, take the top `keep`.
  // Everything below the threshold → archive.
  const published = await prisma.article.findMany({
    where: { status: 'published' },
    orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
    select: { id: true, slug: true, views: true, publishedAt: true },
  });

  if (published.length <= keep) {
    return NextResponse.json({
      ok: true,
      status: 'nothing-to-archive',
      total: published.length,
      keep,
    });
  }

  const keepSet = new Set(published.slice(0, keep).map((a) => a.id));
  const toArchive = published.filter((a) => !keepSet.has(a.id));
  const thresholdViews = published[keep - 1]?.views ?? 0;

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      status: 'dry-run',
      total: published.length,
      wouldArchive: toArchive.length,
      wouldKeep: keepSet.size,
      thresholdViews,
      sampleArchived: toArchive.slice(0, 10).map((a) => ({
        slug: a.slug,
        views: a.views,
      })),
    });
  }

  // Bulk update — chunked to be kind to Turso. 200 IDs per UPDATE.
  let archived = 0;
  const ids = toArchive.map((a) => a.id);
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const res = await prisma.article.updateMany({
      where: { id: { in: chunk } },
      data: { status: 'archived' },
    });
    archived += res.count;
  }

  await prisma.agentLog.create({
    data: {
      agent: 'admin',
      action: 'adsense-cleanup',
      status: 'info',
      message: `Archived ${archived} of ${published.length} articles. Kept top ${keep} by views. Threshold views=${thresholdViews}.`,
    },
  }).catch(() => null);

  return NextResponse.json({
    ok: true,
    status: 'archived',
    total: published.length,
    kept: keepSet.size,
    archived,
    thresholdViews,
    sampleArchived: toArchive.slice(0, 10).map((a) => ({
      slug: a.slug,
      views: a.views,
    })),
  });
}
