// Diagnostic endpoint: peek at recent rows in critical tables. Auth-gated.
//   GET /api/admin/dbcheck?token=$CRON_SECRET&q=seen-debian
// Allowed q values: 'seen-debian', 'seen-recent', 'articles-published-today'.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get('authorization');
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const q = url.searchParams.get('q') ?? 'seen-recent';

  if (q === 'seen-debian') {
    const rows = await prisma.seenSource.findMany({
      where: { title: { contains: 'Debian' } },
      orderBy: { fetchedAt: 'desc' },
      take: 20,
      select: { hash: true, title: true, source: true, fetchedAt: true },
    });
    return NextResponse.json({ ok: true, count: rows.length, rows });
  }
  if (q === 'seen-recent') {
    const rows = await prisma.seenSource.findMany({
      orderBy: { fetchedAt: 'desc' },
      take: 10,
      select: { hash: true, title: true, source: true, fetchedAt: true },
    });
    return NextResponse.json({ ok: true, count: rows.length, rows });
  }
  if (q === 'recent-logs') {
    const rows = await prisma.agentLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { agent: true, action: true, status: true, message: true, meta: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, count: rows.length, rows });
  }
  if (q === 'articles-published-today') {
    const rows = await prisma.article.findMany({
      where: { status: 'published', publishedAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
      orderBy: { publishedAt: 'desc' },
      take: 30,
      select: { slug: true, title: true, originalTitle: true, sourceName: true, qualityScore: true, publishedAt: true },
    });
    return NextResponse.json({ ok: true, count: rows.length, rows });
  }
  return NextResponse.json({ ok: false, error: 'unknown q' }, { status: 400 });
}
