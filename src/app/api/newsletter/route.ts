// Newsletter subscription endpoint. Receives email from the modal + footer
// form. Inserts (or upserts) into NewsletterSubscriber with a one-time token
// for double-opt-in confirmation. If RESEND_API_KEY is set, sends a
// confirmation email; otherwise the row is stored anyway and confirmation
// can be sent later (or skipped in dev).
//
// Returns 200 even when the email is already subscribed — so the modal
// doesn't leak which addresses are in the DB to attackers.
//
// Re-enabled on 2026-05-15 after Resend domain byte-pulse.net was DKIM/SPF
// verified and editorial@byte-pulse.net was wired up as the sending identity.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';
const FROM = process.env.NEWSLETTER_FROM ?? `${SITE_NAME} <editorial@byte-pulse.net>`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'invalid email' }, { status: 400 });
  }
  // Cheap honeypot: reject obvious throwaway domains (mailinator etc.)
  const blocked = /@(mailinator|tempmail|guerrillamail|10minutemail|throwawaymail|sharklasers)\./i;
  if (blocked.test(email)) {
    return NextResponse.json({ ok: true }); // pretend success — don't leak filter
  }

  const token = randomBytes(24).toString('hex');

  try {
    // Upsert: if email exists, keep its existing token + confirmed flag
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {}, // don't reset confirmation status if they re-submit
      create: { email, token, confirmed: false },
    });
  } catch (err) {
    console.warn('[newsletter] db upsert failed:', (err as Error).message);
    return NextResponse.json({ ok: false, error: 'db error' }, { status: 500 });
  }

  // Send confirmation email if Resend is configured. Failure is non-fatal —
  // the subscriber row is already stored and the daily digest cron will
  // pick them up once they hit /api/newsletter/confirm?token=...
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const confirmUrl = `${SITE_URL}/api/newsletter/confirm?token=${token}`;
    const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#e8e8ee;margin:0;padding:30px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#13131a;border-radius:14px;border:1px solid rgba(255,255,255,.06);padding:30px;">
      <tr><td>
        <div style="font-size:22px;font-weight:900;color:#fff;">${SITE_NAME} <span style="color:#ff3366;">·</span> Daily Tech Briefing</div>
        <div style="margin-top:14px;font-size:15px;line-height:1.5;color:#e8e8ee;">
          One last step: click the button below to confirm <strong>${email}</strong> and start receiving the 5 most important tech stories every morning.
        </div>
        <div style="margin:24px 0;">
          <a href="${confirmUrl}" style="display:inline-block;padding:12px 22px;background:#ff3366;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Confirm subscription</a>
        </div>
        <div style="font-size:12px;color:#7a7a8c;line-height:1.5;">
          If the button doesn't work, copy this URL into your browser:<br>
          <span style="color:#9aa0c0;word-break:break-all;">${confirmUrl}</span>
        </div>
        <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,.06);font-size:12px;color:#7a7a8c;">
          You're getting this because someone (probably you) entered this email on ${SITE_URL}. If that wasn't you, just ignore this message — you won't be subscribed.
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
    const text = `Confirm your ${SITE_NAME} subscription:\n${confirmUrl}\n\nIf that wasn't you, just ignore this email.`;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: email,
          subject: `Confirm your ${SITE_NAME} subscription`,
          html,
          text,
          reply_to: 'editorial@byte-pulse.net',
          // List-Unsubscribe on the confirm mail too — mailbox providers
          // weight its presence for inbox placement even on transactional
          // mail. Token already exists at signup; one-click removes the row.
          headers: {
            'List-Unsubscribe': `<${SITE_URL}/api/newsletter/unsubscribe?token=${token}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) console.warn('[newsletter] Resend confirm-email failed:', res.status, await res.text());
    } catch (err) {
      console.warn('[newsletter] confirm-email send failed:', (err as Error).message);
    }
  }

  return NextResponse.json({ ok: true });
}
