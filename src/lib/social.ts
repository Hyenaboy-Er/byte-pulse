// Social broadcaster — fans new articles out to X, LinkedIn, Mastodon, Bluesky,
// Telegram channel. All channels are env-driven: missing creds = silent skip,
// so it stays safe in local dev and during onboarding.
//
// Each channel has its own helper that returns { ok, error }. The orchestrator
// fires them all in parallel after publish; failures are logged but never block
// the publish flow.

import { SITE } from './site';

export type BroadcastTarget = {
  url: string;        // canonical article URL incl. https://
  title: string;
  excerpt: string;
  category?: string;
  tags?: string[];
  imageUrl?: string | null;
};

type ChannelResult = { channel: string; ok: boolean; error?: string };

const SITE_URL = SITE.url;

// Category emoji map — gives every post a visual hook on the first character.
// Engagement on social platforms is 2-3x higher with emoji-led posts per their
// own published research (Twitter 2023, Buffer studies).
const CATEGORY_EMOJI: Record<string, string> = {
  ai: '🤖',
  gaming: '🎮',
  hardware: '⚙️',
  mobile: '📱',
  software: '💾',
  security: '🛡️',
  crypto: '₿',
  science: '🔬',
  ev: '🚗',
  web: '🌐',
};

function emojiFor(category?: string): string {
  if (!category) return '⚡';
  return CATEGORY_EMOJI[category.toLowerCase()] ?? '⚡';
}

// Fetch the hero image as a Buffer suitable for uploading to a social platform.
// Returns null on any error — callers degrade to text-only posts.
async function fetchImageBuffer(imageUrl?: string | null): Promise<{ data: Uint8Array; contentType: string } | null> {
  if (!imageUrl) return null;
  try {
    // For images that go through our own og-proxy, the proxy already caches them
    // at the Vercel edge — so the second fetch is fast. For external URLs we
    // fetch direct with a short timeout.
    const target = imageUrl.startsWith('/') ? `${SITE_URL}${imageUrl}` : imageUrl;
    const res = await fetch(target, { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'Byte-Pulse/1.0' } });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
    if (!contentType.startsWith('image/')) return null;
    const ab = await res.arrayBuffer();
    // Reject obviously-too-big images (>5MB) — most platforms cap there anyway
    if (ab.byteLength > 5 * 1024 * 1024) return null;
    return { data: new Uint8Array(ab), contentType };
  } catch {
    return null;
  }
}

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

  const emoji = emojiFor(t.category);
  // X is short-text — the og:image is auto-fetched from the URL via Twitter
  // cards, so we don't need to manually upload media unless we want
  // a *bigger* card. For now, prioritise the share text + the URL Twitter
  // will auto-render with our self-served og-proxy hero image.
  const tagBlock = (t.tags ?? []).slice(0, 3).map((s) => `#${s.replace(/\s+/g, '')}`).join(' ');
  const text = `${emoji} ${t.title}\n\n${t.url}${tagBlock ? '\n\n' + tagBlock : ''}`.slice(0, 280);
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
    if (!res.ok) {
      const errText = (await res.text()).slice(0, 160);
      // Specific case: X account has no credits left on pay-per-use plan
      if (res.status === 402 && errText.includes('CreditsDepleted')) {
        return { channel: 'x', ok: false, error: 'x-credits-depleted' };
      }
      return { channel: 'x', ok: false, error: `${res.status} ${errText}` };
    }
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

  const emoji = emojiFor(t.category);
  const tagBlock = (t.tags ?? []).slice(0, 4).map((s) => `#${s.replace(/\s+/g, '')}`).join(' ');
  const status = `${emoji} ${t.title}\n\n${t.excerpt}\n\n${t.url}${tagBlock ? '\n\n' + tagBlock : ''}`.slice(0, 500);

  try {
    // 1. Try to attach the hero image. Mastodon Media API:
    //    POST /api/v2/media with multipart/form-data → returns { id, ... }
    //    The id is then attached to the status as media_ids.
    let mediaIds: string[] = [];
    const img = await fetchImageBuffer(t.imageUrl);
    if (img) {
      try {
        const fd = new FormData();
        // Cast to BlobPart-compatible buffer to satisfy TS lib.dom typings.
        const blob = new Blob([img.data as BlobPart], { type: img.contentType });
        fd.append('file', blob, 'hero.jpg');
        fd.append('description', t.title.slice(0, 200));
        const mediaRes = await fetch(`https://${instance}/api/v2/media`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd,
          signal: AbortSignal.timeout(20_000),
        });
        if (mediaRes.ok) {
          const m = await mediaRes.json() as { id?: string };
          if (m.id) mediaIds.push(m.id);
        }
      } catch { /* fall through: post without media */ }
    }

    const body: Record<string, unknown> = { status, visibility: 'public' };
    if (mediaIds.length) body.media_ids = mediaIds;

    const res = await fetch(`https://${instance}/api/v1/statuses`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
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

    const emoji = emojiFor(t.category);

    // 2. Try to upload hero image as a blob → use it as the post's external
    //    embed thumbnail. Bluesky's preferred way of showing images.
    let externalEmbed: Record<string, unknown> | undefined;
    const img = await fetchImageBuffer(t.imageUrl);
    if (img) {
      try {
        const blobRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessJwt}`, 'Content-Type': img.contentType },
          // BodyInit accepts Uint8Array at runtime; cast keeps TS happy across lib versions
          body: img.data as unknown as BodyInit,
          signal: AbortSignal.timeout(20_000),
        });
        if (blobRes.ok) {
          const blobData = await blobRes.json() as { blob?: unknown };
          if (blobData.blob) {
            externalEmbed = {
              $type: 'app.bsky.embed.external',
              external: {
                uri: t.url,
                title: `${emoji} ${t.title}`.slice(0, 200),
                description: t.excerpt.slice(0, 300),
                thumb: blobData.blob,
              },
            };
          }
        }
      } catch { /* fall through: post without embed */ }
    }
    // Fallback embed without image — still gives the link-card UI in Bluesky clients
    if (!externalEmbed) {
      externalEmbed = {
        $type: 'app.bsky.embed.external',
        external: {
          uri: t.url,
          title: `${emoji} ${t.title}`.slice(0, 200),
          description: t.excerpt.slice(0, 300),
        },
      };
    }

    // 3. Build post text with link facet so URL is also clickable inline if user shows it.
    //    Since the embed renders a clickable card, the inline URL is mostly redundant —
    //    we use a short teaser instead.
    const tagBlock = (t.tags ?? []).slice(0, 3).map((s) => `#${s.replace(/\s+/g, '')}`).join(' ');
    const text = `${emoji} ${t.title}${tagBlock ? `\n\n${tagBlock}` : ''}`.slice(0, 290);

    const post: Record<string, unknown> = {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
      embed: externalEmbed,
    };

    const res = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessJwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.post', record: post }),
      signal: AbortSignal.timeout(15_000),
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

// ─── Threads (Meta) — FREE API since 2024 ─────────────────────────────────
// THREADS_USER_ID = numeric user id from Meta Developer Portal
// THREADS_ACCESS_TOKEN = long-lived token (Meta gives 60-day tokens, auto-refresh
//   via /refresh_access_token endpoint we should add on a weekly cron later).
// Threads is Meta's text-first network — pairs perfectly with our tech-news
// format. No business verification needed for personal accounts.
async function postToThreads(t: BroadcastTarget): Promise<ChannelResult> {
  const userId = process.env.THREADS_USER_ID;
  const token = process.env.THREADS_ACCESS_TOKEN;
  if (!userId || !token) return { channel: 'threads', ok: false, error: 'Threads creds missing' };

  const emoji = emojiFor(t.category);
  const tagBlock = (t.tags ?? []).slice(0, 3).map((s) => `#${s.replace(/\s+/g, '')}`).join(' ');
  const text = `${emoji} ${t.title}\n\n${t.excerpt}\n\n${t.url}${tagBlock ? '\n\n' + tagBlock : ''}`.slice(0, 500);

  try {
    // Threads API is two-step: create container → publish container
    // Step 1: create media container with text + optional image_url
    const containerBody = new URLSearchParams({
      media_type: t.imageUrl ? 'IMAGE' : 'TEXT',
      text,
      access_token: token,
      ...(t.imageUrl && { image_url: t.imageUrl.startsWith('/') ? `${SITE_URL}${t.imageUrl}` : t.imageUrl }),
    });
    const containerRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?${containerBody}`, {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
    });
    if (!containerRes.ok) return { channel: 'threads', ok: false, error: `container ${containerRes.status} ${(await containerRes.text()).slice(0, 120)}` };
    const containerData = await containerRes.json() as { id?: string };
    if (!containerData.id) return { channel: 'threads', ok: false, error: 'no container id' };

    // Step 2: publish the container
    const publishRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${containerData.id}&access_token=${token}`, {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
    });
    if (!publishRes.ok) return { channel: 'threads', ok: false, error: `publish ${publishRes.status} ${(await publishRes.text()).slice(0, 120)}` };
    return { channel: 'threads', ok: true };
  } catch (e) {
    return { channel: 'threads', ok: false, error: (e as Error).message };
  }
}

// ─── Pinterest — FREE API ─────────────────────────────────────────────────
// PINTEREST_ACCESS_TOKEN = OAuth token from developers.pinterest.com
// PINTEREST_BOARD_ID = the board id (numeric, get via /v5/boards endpoint)
// Pinterest treats every article as a "pin" with image + title + description
// + destination URL. Massive evergreen-traffic potential for tech tutorials,
// product reviews, deal articles (like our viral Gardena post would crush here).
async function postToPinterest(t: BroadcastTarget): Promise<ChannelResult> {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  const boardId = process.env.PINTEREST_BOARD_ID;
  if (!token || !boardId) return { channel: 'pinterest', ok: false, error: 'Pinterest creds missing' };
  // Pinterest requires an image, no exceptions
  if (!t.imageUrl) return { channel: 'pinterest', ok: false, error: 'no image for pin' };

  const imageUrlAbsolute = t.imageUrl.startsWith('/') ? `${SITE_URL}${t.imageUrl}` : t.imageUrl;

  try {
    const res = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board_id: boardId,
        title: t.title.slice(0, 100),
        description: t.excerpt.slice(0, 500),
        link: t.url,
        media_source: { source_type: 'image_url', url: imageUrlAbsolute },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { channel: 'pinterest', ok: false, error: `${res.status} ${(await res.text()).slice(0, 120)}` };
    return { channel: 'pinterest', ok: true };
  } catch (e) {
    return { channel: 'pinterest', ok: false, error: (e as Error).message };
  }
}

// ─── Tumblr — FREE API ────────────────────────────────────────────────────
// TUMBLR_API_KEY = OAuth2 access token (Tumblr OAuth2 since 2023)
// TUMBLR_BLOG_ID = the blog identifier (e.g. bytepulse.tumblr.com)
// Tumblr's tech audience is smaller than X but more loyal. Posts get
// reblogged for years. The API uses the "neue post format" (NPF) with
// blocks of content.
async function postToTumblr(t: BroadcastTarget): Promise<ChannelResult> {
  const token = process.env.TUMBLR_API_KEY;
  const blogId = process.env.TUMBLR_BLOG_ID;
  if (!token || !blogId) return { channel: 'tumblr', ok: false, error: 'Tumblr creds missing' };

  const emoji = emojiFor(t.category);
  const tagsCsv = (t.tags ?? []).slice(0, 8).map((s) => s.replace(/\s+/g, '')).join(',');
  const content: Array<Record<string, unknown>> = [
    { type: 'text', text: `${emoji} ${t.title}`, subtype: 'heading1' },
    { type: 'text', text: t.excerpt },
  ];
  if (t.imageUrl) {
    const imageUrlAbsolute = t.imageUrl.startsWith('/') ? `${SITE_URL}${t.imageUrl}` : t.imageUrl;
    content.splice(1, 0, { type: 'image', media: [{ url: imageUrlAbsolute, type: 'image/jpeg' }] });
  }
  content.push({ type: 'text', text: `Read more: ${t.url}` });

  try {
    const res = await fetch(`https://api.tumblr.com/v2/blog/${blogId}/posts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, tags: tagsCsv, state: 'published' }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { channel: 'tumblr', ok: false, error: `${res.status} ${(await res.text()).slice(0, 120)}` };
    return { channel: 'tumblr', ok: true };
  } catch (e) {
    return { channel: 'tumblr', ok: false, error: (e as Error).message };
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
    postToThreads(target),
    postToPinterest(target),
    postToTumblr(target),
  ]);
  return results.map((r, i) => {
    const channel = ['x','linkedin','mastodon','bluesky','telegram','threads','pinterest','tumblr'][i];
    return r.status === 'fulfilled'
      ? r.value
      : { channel, ok: false, error: (r.reason as Error)?.message ?? 'rejected' };
  });
}
