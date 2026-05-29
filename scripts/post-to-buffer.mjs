// Postet ein Video über die Buffer-API an TikTok und/oder YouTube.
//
// Buffer ist offizieller Partner beider Plattformen — Auto-Posting ohne
// eigene TikTok-/YouTube-App-Freigabe. Buffer holt das Video per URL, die
// Datei muss also öffentlich erreichbar sein (in der GitHub Action über ein
// GitHub-Release-Asset gelöst).
//
// Lauf:  node post-to-buffer.mjs <öffentliche-video-url> [meta-json] [ziele]
//   meta-json  Pfad zu Artikel-/Sendungsdaten   — default: out/video-meta.json
//   ziele      Kommaliste aus tiktok,youtube    — default: tiktok,youtube
//
// Beispiele:
//   node post-to-buffer.mjs https://… out/video-meta.json            (TikTok + YouTube)
//   node post-to-buffer.mjs https://… out/broadcast/broadcast-meta.json youtube
//
// Env:
//   BUFFER_API_KEY              Pflicht
//   BUFFER_TIKTOK_CHANNEL_ID    optional, default = byte-pulse.net TikTok
//   BUFFER_YOUTUBE_CHANNEL_ID   optional, default = Byte-PulseNet YouTube
//   YOUTUBE_CATEGORY_ID         optional, default 28 (Science & Technology)

import { readFileSync } from 'node:fs';
import { optimizeMetadata } from './optimize-metadata.mjs';

const BUFFER_KEY = process.env.BUFFER_API_KEY;
const CHANNELS = {
  tiktok:  process.env.BUFFER_TIKTOK_CHANNEL_ID  || '6a106ccd090476fb994ac0fe',
  youtube: process.env.BUFFER_YOUTUBE_CHANNEL_ID || '6a10ba31090476fb994c7ae9',
  // X-Channel-ID kommt aus BUFFER_X_CHANNEL_ID — füllen wir, sobald der
  // Operator X einmalig in Buffer verknüpft hat. Bis dahin no-op.
  x:       process.env.BUFFER_X_CHANNEL_ID       || '',
};
const YT_CATEGORY = process.env.YOUTUBE_CATEGORY_ID || '28'; // Science & Technology

const videoUrl = process.argv[2];
const metaFile = process.argv[3] || 'out/video-meta.json';
const targets = (process.argv[4] || 'tiktok,youtube')
  .split(',').map((s) => s.trim().toLowerCase()).filter((s) => CHANNELS[s]); // empty channel id = silently skipped

if (!BUFFER_KEY) { console.error('FEHLER: BUFFER_API_KEY fehlt.'); process.exit(1); }
if (!videoUrl || !/^https?:\/\//.test(videoUrl)) {
  console.error('FEHLER: öffentliche Video-URL als Argument nötig.'); process.exit(1);
}
if (!targets.length) { console.error('FEHLER: keine gültigen Ziele (tiktok,youtube).'); process.exit(1); }

let meta = { title: 'Tech news that matters', url: 'https://byte-pulse.net' };
try { meta = JSON.parse(readFileSync(metaFile, 'utf8')); }
catch { console.log(`[buffer] ${metaFile} nicht gefunden — nutze Default-Metadaten.`); }

// KI-Optimizer-Agent: beste Caption, Hashtags, YouTube-Titel + -Beschreibung.
const opt = await optimizeMetadata(meta);
const hashtagLine = opt.hashtags.map((h) => '#' + h).join(' ');

// UTM-Tracking — jede Plattform bekommt eine eigene Quelle, damit Vercel
// Analytics genau zeigt, welcher Kanal Klicks bringt.
function addUtm(text, source) {
  return text.replace(
    /(https?:\/\/(?:www\.)?byte-pulse\.net\/article\/[a-z0-9-]+)/gi,
    (m) => m + (m.includes('?') ? '&' : '?') + `utm_source=${source}&utm_medium=social`,
  );
}
const captionTikTok  = addUtm(`${opt.caption}\n\n${hashtagLine}`, 'tiktok');
const captionYouTube = addUtm(`${opt.youtubeDescription}\n\n${hashtagLine}`, 'youtube_short');

// X-Caption: 280-Zeichen-Limit, Hashtag-Spam abgewöhnt (X-Algorithmus
// throttled Posts mit >2 Hashtags). Wir nehmen Caption, hängen Article-URL
// dran, optional die 2 stärksten Hashtags am Ende. UTM für Klick-Tracking.
function buildXCaption() {
  const articleUrl = (meta.url || 'https://byte-pulse.net').replace(/\/$/, '');
  const urlWithUtm = articleUrl + (articleUrl.includes('?') ? '&' : '?') + 'utm_source=x&utm_medium=social';
  const topTags = opt.hashtags.slice(0, 2).map((h) => '#' + h).join(' ');
  const reservedForUrl = urlWithUtm.length + 1; // space before url
  const reservedForTags = topTags.length ? topTags.length + 2 : 0; // \n\n#a #b
  const captionBudget = 280 - reservedForUrl - reservedForTags;
  let body = opt.caption.replace(/\n+/g, ' ').trim();
  if (body.length > captionBudget) body = body.slice(0, captionBudget - 1).trimEnd() + '…';
  return `${body} ${urlWithUtm}${topTags ? `\n\n${topTags}` : ''}`;
}
const captionX = buildXCaption();

console.log(`[buffer] KI-Metadaten fertig (${opt.hashtags.length} Hashtags) — Ziele: ${targets.join(', ')}`);

// Mutation mit Variablen — verschachtelte YouTube-Metadaten als GraphQL-Literal
// wären fehleranfällig (Escaping). $input wird serverseitig typgeprüft.
const MUTATION = `mutation Create($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id } }
    ... on MutationError { message }
  }
}`;

function inputFor(target) {
  const base = {
    schedulingType: 'automatic',
    mode: 'addToQueue',
    channelId: CHANNELS[target],
    assets: [{ video: { url: videoUrl } }],
  };
  if (target === 'youtube') {
    return {
      ...base,
      text: captionYouTube,
      metadata: {
        youtube: {
          title: opt.youtubeTitle,
          privacy: 'public',
          categoryId: YT_CATEGORY,
          madeForKids: false,
          notifySubscribers: true,
          embeddable: true,
        },
      },
    };
  }
  if (target === 'x') {
    return { ...base, text: captionX };
  }
  return { ...base, text: captionTikTok }; // tiktok
}

async function postTo(target) {
  const r = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${BUFFER_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: MUTATION, variables: { input: inputFor(target) } }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data) throw new Error(`HTTP ${r.status}`);
  if (data.errors) throw new Error(`GraphQL: ${JSON.stringify(data.errors).slice(0, 300)}`);
  const result = data.data?.createPost;
  if (result?.message) throw new Error(`Buffer: ${result.message}`);
  return result?.post?.id || 'ok';
}

// Jede Plattform unabhängig — ein Fehler bei TikTok darf YouTube nicht killen.
let failed = 0;
for (const target of targets) {
  try {
    const id = await postTo(target);
    console.log(`[buffer] ${target} → in Queue gestellt (Post-ID ${id})`);
  } catch (e) {
    failed++;
    console.error(`[buffer] FEHLER bei ${target}: ${e.message}`);
  }
}
// Exit 1 nur, wenn ALLE Ziele scheitern — sonst gilt der Lauf als erfolgreich.
process.exit(failed === targets.length ? 1 : 0);
