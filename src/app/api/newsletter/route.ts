import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const Body = z.object({ email: z.string().email().max(200) });

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const token = crypto.randomBytes(16).toString('hex');

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, token },
      update: {},
    });
    return NextResponse.json({ ok: true, message: "You're on the list." });
  } catch (err) {
    return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  }
}
