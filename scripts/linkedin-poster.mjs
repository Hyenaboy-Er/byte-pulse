// LinkedIn-Poster — postet EINEN Artikel pro Lauf auf LinkedIn als
// "Article Share" mit Hero-Image-Preview. Same Pattern wie x-poster.mjs:
// liest data/articles-recent.json, hält data/posted-to-linkedin.json
// als Dedup-State, schedule-driven via GitHub Actions cron 2× pro Tag.
//
// Auth: LinkedIn-Posts brauchen einen User-Access-Token (Authorization Code
// Flow). Ablauf einmalig:
//
//   1. App anlegen: https://www.linkedin.com/developers/apps
//   2. Add product → "Share on LinkedIn" + "Sign In with LinkedIn"
//   3. Auth URL aufrufen (3-Legged OAuth), code holen, gegen access_token
//      tauschen via /oauth/v2/accessToken
//   4. Den Person URN holen (GET /v2/userinfo → "sub" feld → urn:li:person:<sub>)
//   5. LINKEDIN_ACCESS_TOKEN + LINKEDIN_AUTHOR_URN als GitHub Secrets setzen
//
// Detailliertes Setup-Skript: scripts/linkedin-oauth-setup.mjs
//
// Env:
//   LINKEDIN_ACCESS_TOKEN   Pflicht — User Access Token mit w_member_social scope
//   LINKEDIN_AUTHOR_URN     Pflicht — z.B. "urn:li:person:abc123..."
//   SITE_URL                optional

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SITE = (process.env.SITE_URL || 'https://www.byte-pulse.net').replace(/\/$/, '');
const TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const AUTHOR = process.env.LINKEDIN_AUTHOR_URN;
const RECENT_FILE = 'data/articles-recent.json';
const POSTED_FILE = 'data/posted-to-linkedin.json';

if (!TOKEN || !AUTHOR) {
  console.error('[linkedin] FEHLER: LINKEDIN_ACCESS_TOKEN und LINKEDIN_AUTHOR_URN nötig.');
  console.error('  Setup-Anleitung siehe scripts/linkedin-poster.mjs Top-Kommentar.');
  process.exit(1);
}

const CATEGORY_EMOJI = {
  ai: '🤖', gaming: '🎮', hardware: '⚙️', mobile: '📱',
  software: '💾', security: '🛡️', crypto: '₿', science: '🔬',
  ev: '🚗', web: '🌐', tech: '⚡',
};

function buildCommentary(article) {
  const emoji = CATEGORY_EMOJI[article.category] || '⚡';
  const url = `${SITE}/article/${article.slug}?utm_source=linkedin&utm_medium=social`;
  // LinkedIn post text: ~1300 char limit hard. We aim ~600.
  const tagBlock = (() => {
    try {
      const tags = JSON.parse(article.tags).slice(0, 4);
      return tags.length ? '\n\n' + tags.map((t) => '#' + t.replace(/\s+/g, '')).join(' ') : '';
    } catch { return ''; }
  })();
  const headline = `${emoji} ${article.title}`;
  // Excerpt zur Hook-Erweiterung
  const excerpt = (article.excerpt || '').replace(/\n+/g, ' ').trim();
  const body = excerpt.length > 350 ? excerpt.slice(0, 349).trimEnd() + '…' : excerpt;

  return `${headline}\n\n${body}\n\n→ Read on Byte-Pulse: ${url}${tagBlock}`;
}

// LinkedIn's modern Share endpoint (UGC API v2)
async function postToLinkedIn(article) {
  const commentary = buildCommentary(article);
  const articleUrl = `${SITE}/article/${article.slug}?utm_source=linkedin&utm_medium=social`;

  // UGC Posts API — Article-Share mit Link-Preview (LinkedIn rendert die og: image
  // der Article-Page automatisch). Kein Bild-Upload nötig.
  const body = {
    author: AUTHOR,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: commentary },
        shareMediaCategory: 'ARTICLE',
        media: [
          {
            status: 'READY',
            originalUrl: articleUrl,
            title: { text: article.title.slice(0, 200) },
            description: { text: (article.excerpt || '').slice(0, 250) },
          },
        ],
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });
  const responseText = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${responseText.slice(0, 240)}`);
  }
  // LinkedIn returns the new post id in the 'x-restli-id' header
  const postId = res.headers.get('x-restli-id') ?? '(unknown)';
  return postId;
}

// --- Main ---
const recent = JSON.parse(readFileSync(RECENT_FILE, 'utf8'));
const posted = existsSync(POSTED_FILE) ? JSON.parse(readFileSync(POSTED_FILE, 'utf8')) : [];
const postedSet = new Set(posted);

const candidate = recent
  .filter((a) => a.status === 'published' && !postedSet.has(a.slug))
  .sort((a, b) => new Date(b.publishedAt ?? 0) - new Date(a.publishedAt ?? 0))[0];

if (!candidate) {
  console.log('[linkedin] Nichts Neues zu posten — alle aktuellen Artikel bereits geteilt.');
  process.exit(0);
}

console.log(`[linkedin] Posting: ${candidate.slug}`);
try {
  const postId = await postToLinkedIn(candidate);
  console.log(`[linkedin] OK — LinkedIn-Post-ID: ${postId}`);
} catch (e) {
  console.error(`[linkedin] FEHLER: ${e.message}`);
  process.exit(1);
}

posted.push(candidate.slug);
writeFileSync(POSTED_FILE, JSON.stringify(posted.slice(-200), null, 2) + '\n');
console.log('[linkedin] data/posted-to-linkedin.json aktualisiert.');
