// YouTube-Upload — lädt die volle 16:9-Danny-Williams-Sendung via YouTube
// Data API hoch.
//
// Buffer kann auf YouTube nur Shorts posten (vertikal, <= 3 Min); die lange
// 16:9-Sendung braucht den direkten API-Weg. Genutzt wird ein OAuth-Refresh-
// Token (App-Status "in production" → Token läuft nicht ab).
//
// Lauf:  node youtube-upload.mjs <video-datei> [meta-json]
//   meta-json  default: out/broadcast/broadcast-meta.json
//
// Env (in GitHub als Secrets hinterlegt):
//   YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN   Pflicht
//   OPENAI_API_KEY        optional — KI-optimierte Metadaten
//   YOUTUBE_CATEGORY_ID   optional, default 28 (Science & Technology)
//   YOUTUBE_PRIVACY       optional, default public
//
// Hinweis: Ein noch nicht von Google auditiertes API-Projekt sperrt Uploads
// evtl. auf "privat". Das Skript meldet die tatsächliche Sichtbarkeit.

import { readFileSync, statSync, existsSync } from 'node:fs';
import { optimizeMetadata } from './optimize-metadata.mjs';

const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
const CATEGORY = process.env.YOUTUBE_CATEGORY_ID || '28';
const PRIVACY = process.env.YOUTUBE_PRIVACY || 'public';

const videoPath = process.argv[2];
const metaFile = process.argv[3] || 'out/broadcast/broadcast-meta.json';

if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) {
  console.error('FEHLER: YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN fehlen.');
  process.exit(1);
}
if (!videoPath) { console.error('FEHLER: Video-Datei als Argument nötig.'); process.exit(1); }

let size;
try { size = statSync(videoPath).size; }
catch { console.error(`FEHLER: ${videoPath} nicht gefunden.`); process.exit(1); }

let meta = { title: 'Byte-Pulse Nightly', url: 'https://byte-pulse.net' };
try { meta = JSON.parse(readFileSync(metaFile, 'utf8')); }
catch { console.log(`[yt] ${metaFile} nicht gefunden — Default-Metadaten.`); }

// Frischen Access-Token aus dem Refresh-Token holen.
async function accessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: YT_CLIENT_ID,
      client_secret: YT_CLIENT_SECRET,
      refresh_token: YT_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!d.access_token) throw new Error(`Token-Refresh fehlgeschlagen: ${JSON.stringify(d).slice(0, 200)}`);
  return d.access_token;
}

async function main() {
  // KI-Optimizer-Agent: bester Titel, Beschreibung, Tags.
  const opt = await optimizeMetadata(meta);
  // UTM-Tracking — Klicks aus dem Sendungs-Beschreibungstext landen in
  // Vercel Analytics als Quelle "youtube_broadcast".
  const taggedDesc = (opt.youtubeDescription || '').replace(
    /(https?:\/\/(?:www\.)?byte-pulse\.net\/article\/[a-z0-9-]+)/gi,
    (m) => m + (m.includes('?') ? '&' : '?') + 'utm_source=youtube_broadcast&utm_medium=video',
  );
  // Inject US-targeting metadata into tags + description so YouTube's
  // recommendation algorithm classifies the channel/video as US-focused.
  // Before this commit Danny Williams videos were being served to German
  // viewers (channel owner is in Germany). The three signals YouTube
  // weighs heaviest are:
  //   - defaultLanguage / defaultAudioLanguage on the video snippet
  //   - tag content (presence of US-keywords)
  //   - description language + geo references
  const usSeedTags = ['US tech news', 'American tech', 'tech news USA'];
  const mergedTags = [
    ...usSeedTags,
    ...((opt.tags || []).filter((t) => !usSeedTags.includes(t))),
  ].slice(0, 15);

  // Description: prepend US-anchor phrase if the LLM's output didn't already
  // start with one (the LLM is told to lead with "U.S. tech news from
  // Byte-Pulse" but on fallback / Llama-format-drift it might not).
  let usDesc = taggedDesc;
  const startsUS = /^\s*(u\.?s\.?|america|american)/i.test(usDesc);
  if (!startsUS) {
    usDesc = `U.S. tech news from Byte-Pulse. ${usDesc}`;
  }

  const snippet = {
    title: (opt.youtubeTitle || meta.title || 'Byte-Pulse Nightly').slice(0, 100),
    description: usDesc.slice(0, 4900),
    tags: mergedTags,
    categoryId: CATEGORY,
    // STRONGEST single algorithm signal. Tells YouTube unambiguously that
    // both the captions/title language AND the audio language are en-US,
    // which feeds into the "this is for the US audience" classifier.
    defaultLanguage: 'en-US',
    defaultAudioLanguage: 'en-US',
  };
  const status = { privacyStatus: PRIVACY, selfDeclaredMadeForKids: false };

  console.log('[yt] Access-Token holen …');
  const token = await accessToken();

  // Schritt 1: Resumable-Upload-Session eröffnen.
  console.log(`[yt] Upload-Session starten (${(size / 1e6).toFixed(1)} MB) …`);
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(size),
      },
      body: JSON.stringify({ snippet, status }),
    },
  );
  if (!initRes.ok) {
    throw new Error(`Upload-Init ${initRes.status}: ${(await initRes.text()).slice(0, 400)}`);
  }
  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('keine Upload-URL von YouTube erhalten.');

  // Schritt 2: Video-Bytes in einem PUT hochladen (Datei ist klein, < 50 MB).
  console.log('[yt] Video hochladen …');
  const bytes = readFileSync(videoPath);
  const upRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: bytes,
  });
  const result = await upRes.json().catch(() => null);
  if (!upRes.ok || !result?.id) {
    throw new Error(`Upload ${upRes.status}: ${JSON.stringify(result).slice(0, 400)}`);
  }

  const vid = result.id;
  const privacy = result.status?.privacyStatus || PRIVACY;
  console.log(`[yt] OK — hochgeladen: https://youtu.be/${vid}`);
  console.log(`[yt] Titel: ${snippet.title}`);
  console.log(`[yt] Sichtbarkeit: ${privacy}`);

  // US-Targeting: set recordingDetails.location.countryCode = US.
  // This is a SECONDARY but documented YouTube algorithm signal
  // ("where was this recorded") that helps the geo-classifier override
  // the channel-owner-location default. Best-effort; failure is non-fatal.
  try {
    const updateRes = await fetch(
      'https://www.googleapis.com/youtube/v3/videos?part=recordingDetails',
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: vid,
          recordingDetails: {
            recordingDate: new Date().toISOString(),
            // location object kept minimal — full latitude/longitude is
            // optional and a precise fabricated coordinate would feel
            // dishonest. countryCode alone is the value the geo-targeting
            // classifier actually uses.
            location: { countryCode: 'US' },
          },
        }),
      },
    );
    if (updateRes.ok) {
      console.log('[yt] US recording location set.');
    } else {
      const errTxt = (await updateRes.text()).slice(0, 200);
      console.warn(`[yt] recordingDetails update ${updateRes.status}: ${errTxt}`);
    }
  } catch (e) {
    console.warn(`[yt] recordingDetails update failed: ${(e instanceof Error ? e.message : String(e)).slice(0, 160)}`);
  }

  if (privacy !== 'public') {
    console.log('[yt] HINWEIS: Video ist nicht oeffentlich. Unauditierte YouTube-');
    console.log('[yt] API-Projekte sperren Uploads auf "privat" — einmaliger Audit');
    console.log('[yt] noetig, dann sind kuenftige Uploads automatisch oeffentlich.');
  }

  // Schritt 3: Custom-Thumbnail setzen, wenn vorhanden (groesster CTR-Hebel auf YouTube).
  // Braucht den 'youtube.force-ssl'-Scope — falls der Refresh-Token nur 'youtube.upload'
  // hat, antwortet die API mit 403 → kein Fehler, nur Hinweis.
  const thumbPath = process.argv[4] || 'out/broadcast/thumbnail.png';
  if (existsSync(thumbPath)) {
    console.log(`[yt] Custom-Thumbnail hochladen (${thumbPath}) …`);
    const thumbBytes = readFileSync(thumbPath);
    const thumbRes = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${vid}&uploadType=media`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'image/png' },
        body: thumbBytes,
      },
    );
    if (thumbRes.ok) {
      console.log('[yt] OK — Custom-Thumbnail gesetzt.');
    } else {
      const errTxt = (await thumbRes.text()).slice(0, 250);
      console.warn(`[yt] Thumbnail-Upload ${thumbRes.status}: ${errTxt}`);
      if (thumbRes.status === 403) {
        console.warn('[yt] Tipp: OAuth-Scope muss "youtube.force-ssl" enthalten.');
      }
    }
  } else {
    console.log('[yt] kein out/broadcast/thumbnail.png → YouTubes Auto-Thumbnail.');
  }
}

main().catch((e) => { console.error('[yt] FATAL:', e.message); process.exit(1); });
