// /api/admin/write-evergreen — picks the next un-published evergreen
// topic from EVERGREEN_QUEUE, runs it through the 4-stage evergreen
// pipeline, and persists as a published article.
//
// Auth: Bearer CRON_SECRET or ?token=
//
// Use: curl -X POST 'https://www.byte-pulse.net/api/admin/write-evergreen' \
//        -H 'Authorization: Bearer <CRON_SECRET>'
//
// On Vercel Pro the full pipeline takes ~3-4 minutes (4 LLM calls,
// gpt-4o for drafter + gpt-4o-mini for editor/verifier/polisher).
// maxDuration 600s gives headroom for the long drafter call.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EVERGREEN_QUEUE, pickEvergreen } from '@/lib/agents/evergreen-topics';
import { writeEvergreen } from '@/lib/agents/evergreen-writer';
import { authorForArticle } from '@/lib/authors';
import { pingIndexNow } from '@/lib/indexnow';
import { SITE } from '@/lib/site';
import { tgInfo, tgError } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 600;

const SITE_URL = SITE.url.replace(/\/$/, '');

function wc(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && url.searchParams.get('token') !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Optional override: ?slug=... to force a specific topic.
  const forceSlug = url.searchParams.get('slug') ?? undefined;

  // Find published slugs in our evergreen set so we skip dupes.
  const allSlugs = EVERGREEN_QUEUE.map((t) => t.slug);
  let publishedSet = new Set<string>();
  try {
    const existing = await prisma.article.findMany({
      where: { slug: { in: allSlugs } },
      select: { slug: true },
    });
    publishedSet = new Set(existing.map((e) => e.slug));
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `db read failed: ${(e as Error).message}` },
      { status: 503 },
    );
  }

  const topic = forceSlug
    ? EVERGREEN_QUEUE.find((t) => t.slug === forceSlug) ?? null
    : pickEvergreen(publishedSet);
  if (!topic) {
    return NextResponse.json({ ok: true, status: 'queue-empty', total: EVERGREEN_QUEUE.length });
  }

  let draft;
  try {
    draft = await writeEvergreen(topic);
  } catch (e) {
    const msg = (e as Error).message;
    await tgError(`Evergreen failed for "${topic.slug}": ${msg.slice(0, 200)}`).catch(() => null);
    return NextResponse.json({ ok: false, error: msg, slug: topic.slug }, { status: 500 });
  }

  // Length floor — evergreen targets 9-min read but pipeline sometimes
  // lands 1500-1700w due to LLM brevity bias. 1500w (= 7.5min read)
  // is the realistic floor; below that the content is genuinely thin.
  const words = wc(draft.content);
  if (words < 1500) {
    return NextResponse.json({
      ok: false,
      error: `evergreen too thin: ${words}w < 1500`,
      slug: topic.slug,
      previewTitle: draft.title,
    });
  }

  // Author = Serhat Er (his own picks, his own opinion)
  const author = authorForArticle(topic.category, topic.slug);

  let created;
  try {
    created = await prisma.article.create({
      data: {
        slug: topic.slug,
        title: draft.title,
        subtitle: draft.subtitle,
        excerpt: draft.excerpt,
        content: draft.content,
        category: topic.category,
        tags: JSON.stringify(draft.tags ?? topic.keywords),
        imageUrl: null, // OG-fallback brand cover via /api/og/<slug>
        imageCredit: null,
        sourceUrl: `${SITE_URL}/article/${topic.slug}`,
        sourceName: 'Byte-Pulse Original',
        originalTitle: topic.title,
        qualityScore: 85, // evergreens carry higher prior — gated separately
        status: 'published',
        publishedAt: new Date(),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `persist failed: ${(e as Error).message}`, slug: topic.slug },
      { status: 500 },
    );
  }

  // IndexNow ping so Bing crawls fast
  pingIndexNow([`${SITE_URL}/article/${topic.slug}`]).catch(() => null);

  await tgInfo(
    `📚 New evergreen live\n${draft.title}\n${draft.internalReadingMinutes} min read · ${words}w · ${topic.category}\n${SITE_URL}/article/${topic.slug}`,
  ).catch(() => null);

  return NextResponse.json({
    ok: true,
    status: 'published',
    slug: topic.slug,
    words,
    readingMinutes: draft.internalReadingMinutes,
    title: draft.title,
    category: topic.category,
    author: author.slug,
    articleId: created.id,
    remainingInQueue: EVERGREEN_QUEUE.length - publishedSet.size - 1,
  });
}

// GET = read-only queue inspection.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && url.searchParams.get('token') !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const allSlugs = EVERGREEN_QUEUE.map((t) => t.slug);
  const existing = await prisma.article.findMany({
    where: { slug: { in: allSlugs } },
    select: { slug: true, status: true, publishedAt: true },
  });
  const publishedSet = new Set(existing.map((e) => e.slug));
  return NextResponse.json({
    ok: true,
    queueSize: EVERGREEN_QUEUE.length,
    published: existing.length,
    remaining: EVERGREEN_QUEUE.length - publishedSet.size,
    topics: EVERGREEN_QUEUE.map((t) => ({
      slug: t.slug,
      title: t.title,
      kind: t.kind,
      published: publishedSet.has(t.slug),
    })),
  });
}
