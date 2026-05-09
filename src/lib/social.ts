// Social broadcaster — fans new articles out to X, LinkedIn, Mastodon, Bluesky,
// Telegram channel. All channels are env-driven: missing creds = silent skip,
// so it stays safe in local dev and during onboarding.
//
// Each channel has its own helper that returns { ok, error }. The orchestrator
// fires them all in parallel after publish; failures are logged but never block
// the publish flow.

export type BroadcastTarget = {
  url: string;        // canonical article URL incl. https://
  title: string;
  excerpt: string;
  category?: string;
  tags?: string[];
  imageUrl?: string | null;
};

type ChannelResult = { channel: string; ok: boolean; error?: string };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';

// ─── X (Twitter) ───────────────────────────────────────────────────────────
// /2/tweets requires user-context auth — App-only Bearer cannot post tweets.
// We sign requests with OAuth 1.0a HMAC-SHA1 (consumer key/secret + access
// token/secret). This is the simplest path for an automated bot.
import { createHmac, randomBytes } from 'node:crypto';

function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauth1Header(opts: {
  method: string; url: string; consumerKey: string; consumerSecret: string;
  token: string; tokenSecret: string;
  // Extra params to include in signature (form-data params, query params).
  // For JSON-body POSTs, this is empty.
  params?: Record<string, string>;
}): string {
  const { method, url, consumerKey, consumerSecret, token, tokenSecret, params = {} } = opts;
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0',
  };
  // Build signature base string
  const allParams = { ...oauthParams, ...params };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => `${rfc3986(k)}=${rfc3986(allParams[k])}`).join('&');
  const baseString = [method.toUpperCase(), rfc3986(url), rfc3986(paramString)].join('&');
  const signingKey = `${rfc3986(consumerSecret)}&${rfc3986(tokenSecret)}`;
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauthParams.oauth_signature = signature;
  // Header: only oauth_* params, RFC3986-encoded, comma-separated, sorted
  const header = 'OAuth ' + Object.keys(oauthParams).sort()
    .map((k) => `${rfc3986(k)}="${rfc3986(oauthParams[k])}"`).join(', ');
  return header;
}

async function postToX(t: BroadcastTarget): Promise<ChannelResult> {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    return { channel: 'x', ok: false, error: 'X OAuth1 creds missing' };
  }

  const tagBlock = (t.tags ?? []).slice(0, 3).map((s) => `#${s.replace(/\s+/g, '')}`).join(' ');
  const text = `${t.title}\n\n${t.url}${tagBlock ? '\n\n' + tagBlock : ''}`.slice(0, 280);
  const url = 'https://api.x.com/2/tweets';

  const authHeader = oauth1Header({
    method: 'POST', url,
    consumerKey, consumerSecret, token: accessToken, tokenSecret: accessTokenSecret,
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { channel: 'x', ok: false, error: `${res.status} ${(await res.text()).slice(0, 120)}` };
    return { channel: 'x', ok: true };
  } catch (e) {
    return { channel: 'x', ok: false, error: (e as Error).message };
  }
}

// ─── LinkedIn ──────────────────────────────────────────────────────────────
// Uses LinkedIn Marketing API. Needs LINKEDIN_ACCESS_TOKEN + LINKEDIN_AUTHOR_URN
// (e.g. urn:li:person:abc123). Posts a UGC share with the article URL.
async function postToLinkedIn(t: BroadcastTarget): Promise<ChannelResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const author = process.env.LINKEDIN_AUTHOR_URN;
  if (!token || !author) return { channel: 'linkedin', ok: false, error: 'LinkedIn creds missing' };

  const body = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: `${t.title}\n\n${t.excerpt}\n\n${t.url}`.slice(0, 2900) },
        shareMediaCategory: 'ARTICLE',
        media: [{ status: 'READY', originalUrl: t.url, title: { text: t.title.slice(0, 200) } }],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  try {
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { channel: 'linkedin', ok: false, error: `${res.status} ${(await res.text()).slice(0, 120)}` };
    return { channel: 'linkedin', ok: true };
  } catch (e) {
    return { channel: 'linkedin', ok: false, error: (e as Error).message };
  }
}

// ─── Mastodon ──────────────────────────────────────────────────────────────
// MASTODON_INSTANCE = e.g. "mastodon.social"
// MASTODON_ACCESS_TOKEN = obtained from /settings/applications on your instance.
async function postToMastodon(t: BroadcastTarget): Promise<ChannelResult> {
  const instance = process.env.MASTODON_INSTANCE;
  const token = process.env.MASTODON_ACCESS_TOKEN;
  if (!instance || !token) return { channel: 'mastodon', ok: false, error: 'Mastodon creds missing' };

  const tagBlock = (t.tags ?? []).slice(0, 4).map((s) => `#${s.replace(/\s+/g, '')}`).join(' ');
  const status = `${t.title}\n\n${t.url}${tagBlock ? '\n\n' + tagBlock : ''}`.slice(0, 500);

  try {
    const res = await fetch(`https://${instance}/api/v1/statuses`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, visibility: 'public' }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { channel: 'mastodon', ok: false, error: `${res.status} ${(await res.text()).slice(0, 120)}` };
    return { channel: 'mastodon', ok: true };
  } catch (e) {
    return { channel: 'mastodon', ok: false, error: (e as Error).message };
  }
}

// ─── Bluesky ───────────────────────────────────────────────────────────────
// BLUESKY_HANDLE = e.g. "bytepulse.bsky.social"
// BLUESKY_APP_PASSWORD = create at bsky.app/settings/app-passwords (not main pw).
async function postToBluesky(t: BroadcastTarget): Promise<ChannelResult> {
  const handle = process.env.BLUESKY_HANDLE;
  const pw = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !pw) return { channel: 'bluesky', ok: false, error: 'Bluesky creds missing' };

  try {
    // 1. Create session to get accessJwt
    const ses = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: pw }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!ses.ok) return { channel: 'bluesky', ok: false, error: `session ${ses.status}` };
    const { accessJwt, did } = await ses.json();

    // 2. Build post with link facet so the URL is clickable
    const text = `${t.title}\n\n${t.url}`;
    const urlStart = text.indexOf(t.url);
    const post: Record<string, unknown> = {
      $type: 'app.bsky.feed.post',
      text: text.slice(0, 300),
      createdAt: new Date().toISOString(),
      facets: urlStart >= 0 ? [{
        index: { byteStart: urlStart, byteEnd: urlStart + t.url.length },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: t.url }],
      }] : undefined,
    };

    const res = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessJwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.post', record: post }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { channel: 'bluesky', ok: false, error: `${res.status} ${(await res.text()).slice(0, 120)}` };
    return { channel: 'bluesky', ok: true };
  } catch (e) {
    return { channel: 'bluesky', ok: false, error: (e as Error).message };
  }
}

// ─── Telegram channel broadcast ────────────────────────────────────────────
// We already have a bot for alerts. To also broadcast to a public channel, set
// TELEGRAM_CHANNEL_ID (e.g. @bytepulse_news). Falls back to silent no-op.
async function postToTelegramChannel(t: BroadcastTarget): Promise<ChannelResult> {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) return { channel: 'telegram', ok: false, error: 'TELEGRAM_CHANNEL_ID not set' };

  // Reuse the alert bot but post to the public channel id instead of personal chat.
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { channel: 'telegram', ok: false, error: 'TELEGRAM_BOT_TOKEN not set' };

  const text = `📰 ${t.title}\n\n${t.excerpt}\n\n${t.url}`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ chat_id: channelId, text, disable_web_page_preview: false }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { channel: 'telegram', ok: false, error: `${res.status}` };
    return { channel: 'telegram', ok: true };
  } catch (e) {
    return { channel: 'telegram', ok: false, error: (e as Error).message };
  }
}

// ─── Public entry ──────────────────────────────────────────────────────────
export async function broadcastNewArticle(article: { slug: string; title: string; excerpt: string; category: string; tags?: string[]; imageUrl?: string | null }): Promise<ChannelResult[]> {
  const target: BroadcastTarget = {
    url: `${SITE_URL.replace(/\/$/, '')}/article/${article.slug}`,
    title: article.title,
    excerpt: article.excerpt,
    category: article.category,
    tags: article.tags,
    imageUrl: article.imageUrl,
  };
  const results = await Promise.allSettled([
    postToX(target),
    postToLinkedIn(target),
    postToMastodon(target),
    postToBluesky(target),
    postToTelegramChannel(target),
  ]);
  return results.map((r, i) => {
    const channel = ['x','linkedin','mastodon','bluesky','telegram'][i];
    return r.status === 'fulfilled'
      ? r.value
      : { channel, ok: false, error: (r.reason as Error)?.message ?? 'rejected' };
  });
}
