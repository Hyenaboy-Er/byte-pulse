import { prisma } from './db';
import { getCategory } from './categories';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'TechPuls';
const FROM = process.env.NEWSLETTER_FROM ?? `${SITE_NAME} <hi@example.com>`;

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export type DailyDigest = {
  subject: string;
  html: string;
  text: string;
  articleCount: number;
};

export async function buildDailyDigest(): Promise<DailyDigest | null> {
  const articles = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
    orderBy: [{ qualityScore: 'desc' }, { publishedAt: 'desc' }],
    take: 5,
  });
  if (!articles.length) return null;

  const head = articles[0];
  const blocks = articles.map((a) => {
    const cat = getCategory(a.category);
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
        <tr><td style="padding:14px 16px;background:#13131a;border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${cat?.color ?? '#7a7a8c'};margin-bottom:6px;">
            ${cat ? escape(cat.emoji + ' ' + cat.name) : ''}
          </div>
          <a href="${SITE_URL}/article/${a.slug}" style="font-family:system-ui,-apple-system,sans-serif;font-size:18px;font-weight:800;color:#fff;text-decoration:none;line-height:1.25;">
            ${escape(a.title)}
          </a>
          <div style="font-size:14px;color:#b9b9c4;margin-top:6px;line-height:1.5;">${escape(a.excerpt)}</div>
          <a href="${SITE_URL}/article/${a.slug}" style="display:inline-block;margin-top:8px;font-size:13px;color:#ff5b85;">Weiterlesen →</a>
        </td></tr>
      </table>`;
  }).join('\n');

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a0a0f;color:#e8e8ee;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:30px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="padding-bottom:20px;">
          <div style="font-size:24px;font-weight:900;color:#fff;">${escape(SITE_NAME)} <span style="color:#ff3366;">·</span> Daily</div>
          <div style="font-size:13px;color:#7a7a8c;">The ${articles.length} most important tech stories of the last 24 hours.</div>
        </td></tr>
        ${blocks}
        <tr><td style="padding-top:18px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#7a7a8c;">
          <a href="${SITE_URL}" style="color:#ff5b85;">Visit the site</a> ·
          <a href="${SITE_URL}/newsletter" style="color:#ff5b85;">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${SITE_NAME} – Daily\n\n` +
    articles.map((a) => `• ${a.title}\n  ${a.excerpt}\n  ${SITE_URL}/article/${a.slug}\n`).join('\n') +
    `\nUnsubscribe: ${SITE_URL}/newsletter`;

  const subject = `${SITE_NAME}: ${head.title}`.slice(0, 90);

  return { subject, html, text, articleCount: articles.length };
}

export async function sendDigestToAll(digest: DailyDigest, opts: { dryRun?: boolean } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  // Only confirmed subscribers (double opt-in). No silent fallback to
  // unconfirmed — sending to people who never confirmed tanks sender
  // reputation and is a CAN-SPAM/GDPR problem.
  const subs = await prisma.newsletterSubscriber.findMany({ where: { confirmed: true } });

  if (opts.dryRun || !apiKey) {
    return { ok: true, sent: 0, recipients: subs.length, dryRun: true, missingKey: !apiKey };
  }
  if (!subs.length) return { ok: true, sent: 0, recipients: 0 };

  // Send PER-subscriber (not batched) so each mail carries a per-user
  // one-click List-Unsubscribe — a hard Gmail/Yahoo bulk-sender
  // requirement since Feb 2024. Missing it = near-guaranteed spam folder.
  // Resend free tier allows 100/day; cap at 90 to stay safe. At current
  // volume this is trivially within limits.
  const batch = subs.slice(0, 90);
  let sent = 0;
  for (const sub of batch) {
    const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${sub.token}`;
    // Swap the generic /newsletter unsubscribe link for this user's
    // tokenised one-click URL in both html + text parts.
    const html = digest.html.replaceAll(`${SITE_URL}/newsletter`, unsubUrl);
    const text = digest.text.replaceAll(`${SITE_URL}/newsletter`, unsubUrl);
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: sub.email,
          subject: digest.subject,
          html,
          text,
          headers: {
            'List-Unsubscribe': `<${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) sent++;
      else console.warn('[newsletter] Resend error:', await res.text());
    } catch (e) {
      console.warn('[newsletter] send failed:', (e as Error).message);
    }
  }
  return { ok: true, sent, recipients: subs.length, dryRun: false };
}
