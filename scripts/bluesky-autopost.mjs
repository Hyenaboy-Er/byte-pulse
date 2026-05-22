// Standalone Bluesky-Auto-Poster — läuft überall wo Node läuft, KOSTENLOS.
//
// Bewusst KEIN Vercel: dieses Skript läuft via GitHub Actions (gratis,
// 2000 Min/Monat frei) und verbraucht damit NULL Vercel-Ressourcen — wichtig,
// weil byte-pulse den Vercel-Hobby-Gratis-Tarif sonst sprengt.
//
// Kein DB nötig: Dedup passiert über Bluesky selbst — wir lesen den eigenen
// Feed des Bots und überspringen Artikel-URLs, die schon gepostet wurden.
//
// Lokal testen:   node --env-file=.env scripts/bluesky-autopost.mjs
// In GitHub CI:   Env kommt aus GitHub Secrets (siehe .github/workflows/)
//
// Env:
//   BLUESKY_HANDLE         z. B. byte-pulse.bsky.social
//   BLUESKY_APP_PASSWORD   App-Password (nicht Login-Passwort)
//   BLUESKY_MAX_PER_RUN    optional, default 3
//   SITE_URL               optional, default https://www.byte-pulse.net

const HANDLE = process.env.BLUESKY_HANDLE;
const APP_PW = process.env.BLUESKY_APP_PASSWORD;
const SITE = (process.env.SITE_URL || 'https://www.byte-pulse.net').replace(/\/$/, '');
const MAX_PER_RUN = Number(process.env.BLUESKY_MAX_PER_RUN || 3);
const PDS = 'https://bsky.social';

if (!HANDLE || !APP_PW) {
  console.error('FEHLER: BLUESKY_HANDLE und BLUESKY_APP_PASSWORD müssen gesetzt sein.');
  process.exit(1);
}

const CATEGORY_EMOJI = {
  ai: '🤖', gaming: '🎮', hardware: '⚙️', mobile: '📱', software: '💾',
  security: '🛡️', crypto: '₿', science: '🔬', ev: '🚗', web: '🌐',
};

async function createSession() {
  const r = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: HANDLE, password: APP_PW }),
  });
  if (!r.ok) throw new Error(`createSession ${r.status}: ${await r.text()}`);
  return r.json();
}

// Holt die zuletzt publizierten Artikel aus der News-Sitemap (EN only).
async function recentArticles() {
  const r = await fetch(`${SITE}/news-sitemap.xml`);
  if (!r.ok) throw new Error(`news-sitemap ${r.status}`);
  const xml = await r.text();
  const blocks = xml.split('<url>').slice(1);
  const out = [];
  for (const b of blocks) {
    const loc = b.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const title = b.match(/<news:title>([^<]+)<\/news:title>/)?.[1];
    const date = b.match(/<news:publication_date>([^<]+)<\/news:publication_date>/)?.[1];
    const img = b.match(/<image:loc>([^<]+)<\/image:loc>/)?.[1];
    if (!loc || !title || loc.includes('/de/')) continue; // nur EN
    out.push({
      url: loc,
      title: decodeEntities(title),
      date: date ? new Date(date) : new Date(0),
      image: img ? decodeEntities(img) : null,
    });
  }
  // neueste zuerst
  return out.sort((a, b) => b.date - a.date);
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'");
}

// Liest den eigenen Bot-Feed und sammelt alle schon geposteten Artikel-URLs.
async function alreadyPostedUrls(did, jwt) {
  const posted = new Set();
  try {
    const r = await fetch(
      `${PDS}/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(did)}&limit=100`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    if (r.ok) {
      const data = await r.json();
      for (const item of data.feed || []) {
        const uri = item?.post?.record?.embed?.external?.uri;
        if (uri) posted.add(uri);
      }
    }
  } catch { /* leerer Feed = nichts gepostet, ok */ }
  return posted;
}

// Holt og:description + Kategorie aus der Artikelseite (für besseren Post-Text).
async function articleMeta(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return {};
    const html = await r.text();
    const desc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i)?.[1];
    const cat = url.match(/\/article\/([a-z]+)-/)?.[1];
    return { desc: desc ? decodeEntities(desc) : '', category: cat };
  } catch {
    return {};
  }
}

async function uploadThumb(jwt, imageUrl) {
  try {
    const r = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null;
    const ct = (r.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!ct.startsWith('image/')) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.byteLength > 900_000) return null; // Bluesky blob-Limit ~1MB
    const up = await fetch(`${PDS}/xrpc/com.atproto.repo.uploadBlob`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': ct },
      body: bytes,
    });
    if (!up.ok) return null;
    return (await up.json()).blob;
  } catch {
    return null;
  }
}

async function postArticle(jwt, did, art) {
  const meta = await articleMeta(art.url);
  const emoji = CATEGORY_EMOJI[meta.category] || '⚡';
  const thumb = art.image ? await uploadThumb(jwt, art.image) : null;

  const external = {
    uri: art.url,
    title: `${emoji} ${art.title}`.slice(0, 290),
    description: (meta.desc || 'Tech news that matters — byte-pulse.net').slice(0, 290),
  };
  if (thumb) external.thumb = thumb;

  const text = `${emoji} ${art.title}`.slice(0, 290);
  const record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    embed: { $type: 'app.bsky.embed.external', external },
  };

  const r = await fetch(`${PDS}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.post', record }),
  });
  if (!r.ok) throw new Error(`createRecord ${r.status}: ${(await r.text()).slice(0, 150)}`);
  return true;
}

async function main() {
  console.log(`[bluesky-autopost] ${new Date().toISOString()}`);
  const { accessJwt, did } = await createSession();
  console.log(`  eingeloggt als ${HANDLE}`);

  const [articles, posted] = await Promise.all([
    recentArticles(),
    (async () => alreadyPostedUrls(did, accessJwt))(),
  ]);
  console.log(`  ${articles.length} Artikel in Sitemap, ${posted.size} bereits gepostet`);

  const todo = articles.filter((a) => !posted.has(a.url)).slice(0, MAX_PER_RUN);
  if (todo.length === 0) {
    console.log('  nichts Neues zu posten — fertig.');
    return;
  }

  let ok = 0;
  for (const art of todo) {
    try {
      await postArticle(accessJwt, did, art);
      ok++;
      console.log(`  ✓ gepostet: ${art.title}`);
      // kleiner menschlicher Abstand zwischen Posts
      await new Promise((r) => setTimeout(r, 4000 + Math.random() * 6000));
    } catch (e) {
      console.error(`  ✗ Fehler bei "${art.title}": ${e.message}`);
    }
  }
  console.log(`[bluesky-autopost] fertig — ${ok}/${todo.length} gepostet.`);
}

main().catch((e) => {
  console.error('[bluesky-autopost] FATAL:', e.message);
  process.exit(1);
});
