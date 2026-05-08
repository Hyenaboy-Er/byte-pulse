import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const Body = z.object({ slug: z.string().min(1) });

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Bad input' }, { status: 400 });

  const a = await prisma.article.findUnique({ where: { slug: parsed.data.slug } });
  if (!a) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  await prisma.article.update({
    where: { id: a.id },
    data: { status: 'rejected' },
  });
  await prisma.agentLog.create({
    data: { agent: 'admin', action: 'unpublish', status: 'info', message: `unpublished ${a.slug}`, meta: null },
  });
  return NextResponse.json({ ok: true, slug: a.slug });
}
