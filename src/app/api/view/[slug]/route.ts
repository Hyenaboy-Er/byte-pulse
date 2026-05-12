// Client-fired view-counter increment. Moved out of the article-page render
// so the page itself stays statically cacheable (force-dynamic was sneaking
// in via prisma.article.update inside the page handler, which made Next.js
// override our Cache-Control to no-store).
//
// Called by a small client-side effect once per page-load. Tolerates being
// called multiple times — at-most-once-per-session enforcement happens on
// the client via sessionStorage to avoid bot-loop inflation.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { slug: string };

export async function POST(_req: Request, ctx: { params: Promise<Params> }) {
  const { slug } = await ctx.params;
  if (!slug || slug.length > 200) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    await prisma.article.update({
      where: { slug },
      data: { views: { increment: 1 } },
    });
  } catch {
    // Article doesn't exist (404 from client) or DB hiccup — ignore.
    // We never block on view-counter success.
  }
  return NextResponse.json({ ok: true });
}
