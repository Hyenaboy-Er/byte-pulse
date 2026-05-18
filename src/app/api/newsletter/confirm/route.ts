// Newsletter confirmation: GET with ?token=<one-time> sets confirmed=true and
// redirects to a thank-you page. Token is single-use — once consumed we
// rotate it to prevent re-confirmation links from leaking.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SITE } from '@/lib/site';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

const SITE_URL = SITE.url;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  if (!token || token.length < 16) {
    return NextResponse.redirect(`${SITE_URL}/newsletter?status=invalid`);
  }

  const sub = await prisma.newsletterSubscriber.findFirst({ where: { token } });
  if (!sub) {
    return NextResponse.redirect(`${SITE_URL}/newsletter?status=invalid`);
  }

  await prisma.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { confirmed: true, token: randomBytes(24).toString('hex') },
  });

  return NextResponse.redirect(`${SITE_URL}/newsletter?status=confirmed`);
}
