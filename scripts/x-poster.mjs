// X-Poster — postet EINEN Artikel pro Lauf an X (Twitter).
//
// Warum dieser Agent existiert: die existierende social.ts-Broadcast-Logik
// postet bei jeder Article-Publication sofort zu X. Bei 30-Min-Cron =
// bis zu 48 Tweets/Tag → reisst durch X-Free-Tier-Limits + sieht spammy aus.
//
// Stattdessen: alle 3 Stunden via GitHub Actions EXAKT 1 Tweet.
// State: data/posted-to-x.json (Slug-Liste). Quelle: data/articles-recent.json
// (das von der Pipeline ohnehin auto-committet wird).
//
// Bei x-credits-depleted → kein Crash, sondern Telegram-Alert + sauberer Exit.
//
// Env:
//   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET   Pflicht
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID                              optional
//   SITE_URL                                                          optional

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHmac, randomBytes } from 'node:crypto';

const SITE = (process.env.SITE_URL || 'https://www.byte-pulse.net').replace(/\/$/, '');
const RECENT_FILE = 'data/articles-recent.json';
const POSTED_FILE = 'data/posted-to-x.json';

const KEY  = process.env.X_API_KEY;
const SEC  = process.env.X_API_SECRET;
const TOK  = process.env.X_ACCESS_TOKEN;
const TSEC = process.env.X_ACCESS_TOKEN_SECRET;

if (!KEY || !SEC || !TOK || !TSEC) {
  console.error('[x] FEHLER: X-OAuth1-Credentials fehlen.'); process.exit(1);
}

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT  = process.env.TELEGRAM_CHAT_ID;
async function tg(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text, disable_web_page_preview: false }),
    });
  } catch {}
}

// ─── OAuth 1.0a HMAC-SHA1 Signing ─────────────────────────────────────────
function rfc3986(s) {
  return encodeURIComponent(String(s)).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauth1Header({ method, url, body }) {
  const params = {
    oauth_consumer_key: KEY,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: TOK,
    oauth_version: '1.0',
  };
  const paramStr = Object.keys(params).sort()
    .map(k => `${rfc3986(k)}=${rfc3986(params[k])}`).join('&');
  const baseStr  = `${method}&${rfc3986(url)}&${rfc3986(paramStr)}`;
  const signKey  = `${rfc3986(SEC)}&${rfc3986(TSEC)}`;
  params.oauth_signature = createHmac('sha1', signKey).update(baseStr).digest('base64');
  return 'OAuth ' + Object.keys(params).sort()
    .map(k => `${rfc3986(k)}="${rfc3986(params[k])}"`).join(', ');
}

// ─── Tweet-Text bauen ─────────────────────────────────────────────────────
const CATEGORY_EMOJI = {
  ai: '🤖', gaming: '🎮', hardware: '⚙️', mobile: '📱',
  software: '💾', security: '🛡️', crypto: '₿', science: '🔬',
  ev: '🚗', web: '🌐', tech: '⚡',
};

function buildText(article) {
  const emoji = CATEGORY_EMOJI[article.category] || '⚡';
  const url = `${SITE}/article/${article.slug}?utm_source=x&utm_medium=social`;
  const tags = (() => {
    try { return JSON.parse(article.tags); } catch { return []; }
  })().slice(0, 2).map(t => '#' + t.replace(/\s+/g, ''));
  const tagBlock = tags.length ? '\n\n' + tags.join(' ') : '';
  // X = 280 char limit. URLs zählen X-seitig pauschal als 23 chars.
  const reservedUrl  = 24;          // ' ' + URL als 23
  const reservedTags = tagBlock.length;
  const titleBudget  = 280 - emoji.length - 1 - reservedUrl - reservedTags;
  let title = article.title;
  if (title.length > titleBudget) title = title.slice(0, titleBudget - 1).trimEnd() + '…';
  return `${emoji} ${title}\n\n${url}${tagBlock}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────
const recent = JSON.parse(readFileSync(RECENT_FILE, 'utf8'));
const posted = existsSync(POSTED_FILE) ? JSON.parse(readFileSync(POSTED_FILE, 'utf8')) : [];
const postedSet = new Set(posted);

// Sortiere nach publishedAt absteigend, nimm ersten ungeposteten.
const candidate = recent
  .filter(a => a.status === 'published' && !postedSet.has(a.slug))
  .sort((a, b) => new Date(b.publishedAt ?? 0) - new Date(a.publishedAt ?? 0))[0];

if (!candidate) {
  console.log('[x] Nichts Neues zu posten — alle aktuellen Artikel bereits getwittert.');
  process.exit(0);
}

const text = buildText(candidate);
console.log(`[x] Posting: ${candidate.slug}`);
console.log(`[x] Text (${text.length} chars):\n${text}\n`);

const url = 'https://api.x.com/2/tweets';
const auth = oauth1Header({ method: 'POST', url, body: { text } });

const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text }),
});
const respText = await res.text();

if (!res.ok) {
  console.error(`[x] FEHLER ${res.status}: ${respText.slice(0, 240)}`);
  if (res.status === 402 || /CreditsDepleted|UsageCapExceeded/i.test(respText)) {
    await tg(`X-Posting blockiert: ${respText.slice(0, 200)}\n\nAccount: @bytePulsenew\nReset typischerweise am 1. des Monats UTC.`);
    process.exit(0); // sauber raus, sonst läuft GH-Action red
  }
  process.exit(1);
}

const data = JSON.parse(respText);
const tweetId = data?.data?.id;
console.log(`[x] OK — Tweet ${tweetId} live: https://x.com/bytePulsenew/status/${tweetId}`);

// State persistieren — letzte 200 Slugs behalten, ältere fliegen raus.
posted.push(candidate.slug);
writeFileSync(POSTED_FILE, JSON.stringify(posted.slice(-200), null, 2) + '\n');
console.log(`[x] data/posted-to-x.json aktualisiert.`);
