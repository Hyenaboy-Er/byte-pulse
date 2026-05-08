// Telegram notifier — sends alerts + daily digests to the operator's chat.
// Configured via env vars: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.
// Silently no-op if either is missing — code stays safe in local dev.

const API = 'https://api.telegram.org';

export type TgResult = { ok: boolean; error?: string };

function ts(): string {
  const d = new Date();
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

export async function tg(text: string, opts?: { silent?: boolean; html?: boolean }): Promise<TgResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { ok: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing' };

  const body: Record<string, unknown> = {
    chat_id: chat,
    text,
    disable_notification: !!opts?.silent,
    disable_web_page_preview: true,
  };
  if (opts?.html) body.parse_mode = 'HTML';

  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `${res.status} ${err.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Convenience helpers (no HTML — keeps things bullet-proof under varied content)

export const tgInfo = (msg: string) => tg(`[${ts()}] ${msg}`, { silent: true });
export const tgWarn = (msg: string) => tg(`WARN [${ts()}] ${msg}`);
export const tgError = (msg: string) => tg(`ALERT [${ts()}] ${msg}`);

// Daily digest formatter
export function formatDigest(stats: {
  yesterdayPublished: number;
  yesterdayErrors: number;
  total: number;
  topArticles: { title: string; views: number; slug: string }[];
  monitorFlags: number;
  trendsSnapshot?: string[];
}): string {
  const lines: string[] = [];
  lines.push(`Byte-Pulse Daily Briefing — ${new Date().toLocaleDateString('en-GB')}`);
  lines.push('');
  lines.push(`Yesterday: ${stats.yesterdayPublished} articles published, ${stats.yesterdayErrors} errors`);
  lines.push(`Total articles on site: ${stats.total}`);
  if (stats.monitorFlags > 0) {
    lines.push(`Monitor flags: ${stats.monitorFlags} articles need review`);
  }
  if (stats.topArticles.length) {
    lines.push('');
    lines.push('Top articles (by views):');
    stats.topArticles.slice(0, 5).forEach((a, i) => {
      lines.push(`${i + 1}. ${a.title.slice(0, 70)} (${a.views})`);
    });
  }
  if (stats.trendsSnapshot?.length) {
    lines.push('');
    lines.push(`Trending now: ${stats.trendsSnapshot.slice(0, 8).join(', ')}`);
  }
  lines.push('');
  lines.push('https://byte-pulse.net');
  return lines.join('\n');
}
