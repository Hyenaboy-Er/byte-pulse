import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Body accepts a single slug or an array — array form is used by the dedup
// cleanup script to remove multiple near-duplicate articles in one shot.
const Body = z.object({
  slug: z.union([z.string().min(1), z.array(z.string().min(1)).max(50)]).optional(),
  slugs: z.array(z.string().min(1)).max(50).optional(),
}).refine((v) => !!v.slug || !!v.slugs, { message: 'Provide slug or slugs' });

export async function POST(req: Request) {
  // Auth: require CRON_SECRET via Bearer header or ?token. Previously this
  // route was UNAUTHED, which meant anyone with the URL could unpublish any
  // article — a real risk while we ship cleanup scripts publicly.
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Bad input' }, { status: 400 });

  const slugs: string[] = parsed.data.slugs
    ?? (Array.isArray(parsed.data.slug) ? parsed.data.slug : [parsed.data.slug!]);

  const results = await Promise.all(
    slugs.map(async (slug) => {
      const a = await prisma.article.findUnique({ where: { slug } });
      if (!a) return { slug, ok: false, error: 'not found' };
      await prisma.article.update({ where: { id: a.id }, data: { status: 'rejected' } });
      await prisma.agentLog.create({
        data: { agent: 'admin', action: 'unpublish', status: 'info', message: `unpublished ${slug}` },
      });
      return { slug, ok: true };
    })
  );
  const failed = results.filter((r) => !r.ok).length;
  return NextResponse.json({ ok: failed === 0, unpublished: results.length - failed, results });
}
