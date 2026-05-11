// Email-Watcher agent — polls Gmail INBOX every 30min, finds operational alerts
// (Google Search Console, AdSense, Amazon Associates, Vercel, OpenAI, etc.),
// classifies them, and forwards summaries to Telegram so the operator never
// misses a critical email. Re-runs are safe: every Message-ID it has seen is
// stored in EmailSeen so it never alerts twice on the same message.
//
// Requires three env vars (no-ops gracefully if any is missing):
//   GMAIL_IMAP_USER       — full Gmail address, e.g. serhaterlev@gmail.com
//   GMAIL_IMAP_PASSWORD   — Gmail "App Password" (16 chars, no spaces)
//                           https://myaccount.google.com/apppasswords
//   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID — already configured for the rest of the stack
//
// Architecture: stateless cron-friendly. Each invocation:
//   1. Open IMAP TLS connection
//   2. Search INBOX for messages received in the last 24h (UID > known-baseline)
//   3. For each new message: parse Message-ID + From + Subject + plain-text body
//   4. Classify by sender domain + subject keywords
//   5. Insert EmailSeen row (UNIQUE on messageId — safe against races)
//   6. If category is 'critical' or 'monetization' or 'seo' → Telegram alert
//   7. Close connection. Total runtime: ~3-8s for an inbox with <50 new emails.

import { prisma } from '../db';
import { tg } from '../telegram';

const CRITICAL_SENDERS = [
  // Platform / infra
  'noreply@vercel.com', 'noreply@github.com', 'security@github.com',
  'noreply@cloudflare.com', 'no-reply@accounts.google.com',
  // AI / cost
  'team@openai.com', 'noreply@openai.com', 'noreply@anthropic.com',
  // Monetization
  'no-reply@amazon.com', 'no-reply@amazon.de', 'auto-confirm@amazon.com',
  'partner-net@amazon.de', 'adsense-noreply@google.com', 'noreply@adsense.com',
  'noreply@skimlinks.com', 'noreply@adsterra.com', 'noreply@onesignal.com',
  // SEO
  'sc-noreply@google.com', 'wmt-noreply@google.com', 'noreply-sc@google.com',
];

const CRITICAL_DOMAINS = [
  'vercel.com', 'github.com', 'openai.com', 'anthropic.com', 'cloudflare.com',
  'adsense.com', 'amazon.com', 'amazon.de', 'amazon.co.uk', 'amazon.es', 'amazon.fr', 'amazon.it',
  'skimlinks.com', 'adsterra.com', 'onesignal.com',
  'google.com', // Search Console / AdSense / etc — narrowed by subject keywords
];

const CRITICAL_SUBJECT_TERMS = [
  'search console', 'indexierung', 'index coverage', 'duplikat', 'noindex', 'crawl error',
  'adsense', 'ad review', 'policy violation', 'payment', 'tax form', 'w-8',
  'quota', 'rate limit', 'limit exceeded', 'usage threshold',
  'deployment failed', 'build failed', 'error report',
  'approved', 'rejected', 'declined', 'verified', 'verification',
  'unusual activity', 'security alert', 'sign-in', 'sign in',
];

type Category = 'critical' | 'monetization' | 'seo' | 'platform' | 'other';

function classify(from: string, subject: string): Category {
  const fromLow = from.toLowerCase();
  const subjLow = subject.toLowerCase();
  const fromAddr = (fromLow.match(/<([^>]+)>/)?.[1] ?? fromLow).trim();
  const fromDomain = fromAddr.split('@').pop() ?? '';

  // Explicit allowlist hits → critical
  if (CRITICAL_SENDERS.some((s) => fromAddr.includes(s))) {
    if (subjLow.includes('search console') || subjLow.includes('indexierung') || subjLow.includes('duplikat'))
      return 'seo';
    if (fromAddr.includes('amazon') || fromAddr.includes('skimlinks') || fromAddr.includes('adsterra') ||
        fromAddr.includes('adsense') || fromAddr.includes('onesignal')) return 'monetization';
    if (fromAddr.includes('vercel') || fromAddr.includes('cloudflare') || fromAddr.includes('github')) return 'platform';
    return 'critical';
  }

  // Domain + keyword combo for broader matches
  if (CRITICAL_DOMAINS.some((d) => fromDomain.endsWith(d))) {
    if (CRITICAL_SUBJECT_TERMS.some((t) => subjLow.includes(t))) {
      if (subjLow.includes('search console') || subjLow.includes('indexier')) return 'seo';
      if (subjLow.includes('adsense') || subjLow.includes('payment') || subjLow.includes('amazon') ||
          subjLow.includes('tax')) return 'monetization';
      return 'critical';
    }
  }

  return 'other';
}

export type WatchReport = {
  ok: boolean;
  fetched: number;
  newMessages: number;
  byCategory: Record<Category, number>;
  alertsSent: number;
  error?: string;
  skipped?: string;
};

const EMPTY_REPORT: WatchReport = {
  ok: true,
  fetched: 0,
  newMessages: 0,
  byCategory: { critical: 0, monetization: 0, seo: 0, platform: 0, other: 0 },
  alertsSent: 0,
};

export async function runEmailWatcher(opts?: { sinceHours?: number }): Promise<WatchReport> {
  const user = process.env.GMAIL_IMAP_USER;
  const pass = process.env.GMAIL_IMAP_PASSWORD;
  if (!user || !pass) {
    return { ...EMPTY_REPORT, skipped: 'GMAIL_IMAP_USER or GMAIL_IMAP_PASSWORD not set' };
  }

  // Lazy import — keeps cold start fast on the request that doesn't have creds.
  let ImapFlow: typeof import('imapflow').ImapFlow;
  let simpleParser: typeof import('mailparser').simpleParser;
  try {
    ({ ImapFlow } = await import('imapflow'));
    ({ simpleParser } = await import('mailparser'));
  } catch (err) {
    return { ...EMPTY_REPORT, ok: false, error: `imapflow/mailparser not installed: ${(err as Error).message}` };
  }

  const sinceHours = Math.max(1, Math.min(168, opts?.sinceHours ?? 24));
  const sinceDate = new Date(Date.now() - sinceHours * 3600 * 1000);

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const report: WatchReport = { ...EMPTY_REPORT };
  let alertLines: string[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Gmail accepts ISO dates in SEARCH; ImapFlow translates to IMAP format.
      const uids = await client.search({ since: sinceDate }) as number[] | false;
      const uidList = Array.isArray(uids) ? uids : [];
      report.fetched = uidList.length;

      for (const uid of uidList) {
        // Fetch envelope + source for parsing
        const msg = await client.fetchOne(uid, { envelope: true, source: true, uid: true });
        if (!msg || !msg.envelope) continue;

        const messageId = msg.envelope.messageId;
        if (!messageId) continue;

        const fromAddr = msg.envelope.from?.[0]
          ? `${msg.envelope.from[0].name ?? ''} <${msg.envelope.from[0].address ?? ''}>`.trim()
          : '(unknown)';
        const subject = msg.envelope.subject ?? '(no subject)';
        const category = classify(fromAddr, subject);
        report.byCategory[category]++;

        // Idempotency: skip if we've seen this Message-ID before.
        try {
          await prisma.emailSeen.create({
            data: { messageId, fromAddr: fromAddr.slice(0, 250), subject: subject.slice(0, 500), category },
          });
        } catch {
          // Unique-constraint violation → already seen → skip the alert
          continue;
        }

        report.newMessages++;

        if (category === 'critical' || category === 'monetization' || category === 'seo') {
          // Parse body for a short summary (~280 chars). simpleParser handles MIME, HTML→text.
          let snippet = '';
          try {
            const parsed = await simpleParser(msg.source as Buffer);
            const text = parsed.text || parsed.textAsHtml?.replace(/<[^>]+>/g, ' ') || '';
            snippet = text.replace(/\s+/g, ' ').trim().slice(0, 280);
          } catch {
            // Body parse failure is non-fatal — alert without snippet
          }

          const tag = category === 'seo' ? 'SEO' : category === 'monetization' ? 'MONEY' : 'CRITICAL';
          alertLines.push(
            `[${tag}] ${subject.slice(0, 120)}\n  from: ${fromAddr.slice(0, 90)}` +
            (snippet ? `\n  ${snippet}` : '')
          );
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    report.ok = false;
    report.error = (err as Error).message;
  } finally {
    try { await client.logout(); } catch {}
  }

  // Batch all alerts into one Telegram message so we don't spam.
  if (alertLines.length) {
    const message = `📬 Email Watcher · ${alertLines.length} new\n\n` + alertLines.join('\n\n');
    const r = await tg(message);
    if (r.ok) report.alertsSent = alertLines.length;
  }

  try {
    await prisma.agentLog.create({
      data: {
        agent: 'email-watcher',
        action: 'poll',
        status: report.ok ? 'success' : 'error',
        message: report.error ?? `new=${report.newMessages}, alerts=${report.alertsSent}`,
        meta: JSON.stringify(report.byCategory),
      },
    });
  } catch {}

  return report;
}
