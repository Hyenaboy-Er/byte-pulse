// Social-Retry Agent — finds failed social broadcasts and re-tries them.
//
// Architecture choice: lightweight, no new DB table. We reuse the existing
// agentLog where every broadcast attempt already writes a row. Failed rows
// (status='error', agent='social', action='broadcast-<channel>') become the
// retry queue. Each retry decrements a budget tracked in meta; once budget
// hits 0 we give up and mark it permanently failed.
//
// Backoff schedule (in minutes):
//   attempt 1 → original publish time
//   attempt 2 → +5 min
//   attempt 3 → +30 min
//   attempt 4 → +2 hours
//   attempt 5 → +12 hours, then give up
//
// Run via /api/social-retry on a 5-minute cron. Idempotent — each retry
// updates the original failure-log row instead of creating a new one.

import { prisma } from '../db';
import { broadcastNewArticle } from '../social';
import { tg } from '../telegram';

const BACKOFF_MINUTES = [0, 5, 30, 120, 720]; // [attempt 0..4]
const MAX_ATTEMPTS = BACKOFF_MINUTES.length;
const MAX_AGE_HOURS = 24; // give up after 24h regardless

type RetryRow = {
  id: string;
  message: string | null;
  meta: string | null;
  createdAt: Date;
  action: string;
};

type RetryMeta = {
  slug?: string;
  attempts?: number;
  nextRetryAt?: string;
  lastError?: string;
};

export type SocialRetryReport = {
  pendingFound: number;
  retried: number;
  succeeded: number;
  gaveUp: number;
  channels: Record<string, { retried: number; succeeded: number; gaveUp: number }>;
};

function parseMeta(s: string | null): RetryMeta {
  if (!s) return {};
  try { return JSON.parse(s) as RetryMeta; } catch { return {}; }
}

function channelFromAction(action: string): string {
  // action format: 'broadcast-<channel>' (e.g. 'broadcast-mastodon')
  const m = action.match(/^broadcast-(.+)$/);
  return m ? m[1] : 'unknown';
}

export async function runSocialRetry(opts?: { limit?: number }): Promise<SocialRetryReport> {
  const limit = Math.max(1, Math.min(20, opts?.limit ?? 10));

  // Pull recent error-state social broadcast rows. Only the ones older than
  // their nextRetryAt are due. Older than 24h are abandoned.
  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 3600_000);
  const candidates = await prisma.agentLog.findMany({
    where: {
      agent: 'social',
      status: 'error',
      action: { startsWith: 'broadcast-' },
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'desc' },
    take: limit * 3,
  });

  const channels: SocialRetryReport['channels'] = {};
  const bump = (ch: string, key: keyof SocialRetryReport['channels'][string]) => {
    channels[ch] = channels[ch] ?? { retried: 0, succeeded: 0, gaveUp: 0 };
    channels[ch][key]++;
  };

  let pendingFound = 0;
  let retried = 0;
  let succeeded = 0;
  let gaveUp = 0;

  const now = Date.now();
  const dueRows: RetryRow[] = [];
  for (const c of candidates) {
    if (dueRows.length >= limit) break;
    const meta = parseMeta(c.meta);
    const attempts = meta.attempts ?? 1;
    if (attempts >= MAX_ATTEMPTS) continue;
    const nextRetry = meta.nextRetryAt ? new Date(meta.nextRetryAt).getTime() : c.createdAt.getTime();
    if (nextRetry > now) continue;
    pendingFound++;
    dueRows.push({ id: c.id, message: c.message, meta: c.meta, createdAt: c.createdAt, action: c.action });
  }

  for (const row of dueRows) {
    const meta = parseMeta(row.meta);
    const slug = meta.slug ?? (row.message ?? '').split('|')[0];
    if (!slug) continue;

    const channel = channelFromAction(row.action);
    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article || article.status !== 'published') {
      // Article is gone or unpublished — abandon
      await prisma.agentLog.update({
        where: { id: row.id },
        data: { meta: JSON.stringify({ ...meta, attempts: MAX_ATTEMPTS, abandoned: 'article-gone' }) },
      }).catch(() => null);
      bump(channel, 'gaveUp');
      gaveUp++;
      continue;
    }

    // Re-fire broadcast. This will fan out to ALL channels (we could narrow
    // to just one, but fanning is fine — each channel deduplicates via its
    // own API or harmless re-posts). Capture the result for THIS channel.
    let success = false;
    let newError = 'unknown';
    try {
      const results = await broadcastNewArticle({
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        category: article.category,
        tags: (() => { try { return JSON.parse(article.tags) as string[]; } catch { return []; } })(),
        imageUrl: article.imageUrl,
      });
      const ours = results.find((r) => r.channel === channel);
      success = ours?.ok === true;
      newError = ours?.error ?? 'no-result';
    } catch (err) {
      newError = (err as Error).message;
    }

    retried++;
    bump(channel, 'retried');

    const nextAttempt = (meta.attempts ?? 1) + 1;
    if (success) {
      // Promote the log entry from error→success
      await prisma.agentLog.update({
        where: { id: row.id },
        data: { status: 'success', meta: JSON.stringify({ ...meta, attempts: nextAttempt, retried: true }) },
      }).catch(() => null);
      succeeded++;
      bump(channel, 'succeeded');
    } else if (nextAttempt >= MAX_ATTEMPTS) {
      // Out of budget — mark abandoned but keep status=error
      await prisma.agentLog.update({
        where: { id: row.id },
        data: { meta: JSON.stringify({ ...meta, attempts: nextAttempt, abandoned: 'max-attempts', lastError: newError.slice(0, 200) }) },
      }).catch(() => null);
      gaveUp++;
      bump(channel, 'gaveUp');
    } else {
      // Schedule next retry
      const waitMinutes = BACKOFF_MINUTES[nextAttempt] ?? 720;
      const nextRetryAt = new Date(Date.now() + waitMinutes * 60_000).toISOString();
      await prisma.agentLog.update({
        where: { id: row.id },
        data: { meta: JSON.stringify({ ...meta, attempts: nextAttempt, nextRetryAt, lastError: newError.slice(0, 200) }) },
      }).catch(() => null);
    }
  }

  // Alert if any channel is having a bad day
  const repeatedFailures = Object.entries(channels).filter(([_, s]) => s.gaveUp >= 2);
  if (repeatedFailures.length) {
    await tg(
      `⚠️ Social-Retry · folgende Kanäle haben mehrfach gefailed:\n` +
      repeatedFailures.map(([ch, s]) => `  ${ch}: ${s.gaveUp} aufgegeben, ${s.retried} retries`).join('\n') +
      `\n\nWahrscheinlich: Token abgelaufen oder Rate-Limit. Logs prüfen.`
    );
  }

  return { pendingFound, retried, succeeded, gaveUp, channels };
}
