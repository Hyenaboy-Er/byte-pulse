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
  const subs = await prisma.newsletterSubscriber.findMany({ where: { confirmed: true } });
  // Note: in production add double-opt-in. For now we send to all collected addresses.
  const allSubs = subs.length ? subs : await prisma.newsletterSubscriber.findMany();

  const recipients = allSubs.map((s) => s.email);
  if (opts.dryRun || !apiKey) {
    return { ok: true, sent: 0, recipients: recipients.length, dryRun: true, missingKey: !apiKey };
  }
  if (!recipients.length) return { ok: true, sent: 0, recipients: 0 };

  // Send batched (Resend supports up to 100 per request)
  const chunks: string[][] = [];
  for (let i = 0; i < recipients.length; i += 100) chunks.push(recipients.slice(i, i + 100));

  let sent = 0;
  for (const chunk of chunks) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: chunk,
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
      }),
    });
    if (res.ok) sent += chunk.length;
    else console.warn('[newsletter] Resend error:', await res.text());
  }
  return { ok: true, sent, recipients: recipients.length, dryRun: false };
}
