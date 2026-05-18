// One-click newsletter unsubscribe (RFC 8058).
//
// GET  ?token=  → human clicks the footer link → remove + show a page.
// POST ?token=  → Gmail/Yahoo "List-Unsubscribe-Post: One-Click" sends a
//                 POST; we MUST honour it and return 200 fast, no UI.
//
// Removing the row (not just confirmed=false) is the cleanest GDPR stance:
// the person asked to be gone, so we don't keep their address around.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

const SITE_URL = SITE.url;

async function unsubscribe(token: string): Promise<boolean> {
  if (!token || token.length < 16) return false;
  const sub = await prisma.newsletterSubscriber.findFirst({ where: { token } });
  if (!sub) return false;
  await prisma.newsletterSubscriber.delete({ where: { id: sub.id } }).catch(() => null);
  return true;
}

export async function POST(req: Request) {
  // One-click: just do it, return 200 immediately. No body needed.
  const token = new URL(req.url).searchParams.get('token') ?? '';
  await unsubscribe(token);
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const ok = await unsubscribe(token);
  const msg = ok
    ? "You're unsubscribed. No more emails — sorry to see you go."
    : 'This unsubscribe link is invalid or already used.';
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed · Byte-Pulse</title>
<meta name="robots" content="noindex">
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#e8e8ee;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.c{max-width:420px;text-align:center;padding:24px}a{color:#ff5b85}</style></head>
<body><div class="c"><div style="font-size:40px">📭</div>
<h1 style="font-size:22px;font-weight:800">${ok ? 'Unsubscribed' : 'Hmm'}</h1>
<p style="color:#b9b9c4;line-height:1.5">${msg}</p>
<p><a href="${SITE_URL}">← Back to Byte-Pulse</a></p></div></body></html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}
