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

import { readFileSync, statSync } from 'node:fs';
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
  const snippet = {
    title: (opt.youtubeTitle || meta.title || 'Byte-Pulse Nightly').slice(0, 100),
    description: (opt.youtubeDescription || '').slice(0, 4900),
    tags: (opt.tags || []).slice(0, 15),
    categoryId: CATEGORY,
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
  if (privacy !== 'public') {
    console.log('[yt] HINWEIS: Video ist nicht oeffentlich. Unauditierte YouTube-');
    console.log('[yt] API-Projekte sperren Uploads auf "privat" — einmaliger Audit');
    console.log('[yt] noetig, dann sind kuenftige Uploads automatisch oeffentlich.');
  }
}

main().catch((e) => { console.error('[yt] FATAL:', e.message); process.exit(1); });
