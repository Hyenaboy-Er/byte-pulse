// Postet ein Video über die Buffer-API an einen verbundenen Kanal (TikTok).
//
// Buffer ist offizieller TikTok-Partner — über Buffer geht Auto-Posting zu
// TikTok ohne eigene TikTok-App-Freigabe. Buffer holt das Video per URL, die
// Datei muss also öffentlich erreichbar sein (in der GitHub Action via
// GitHub-Release-Asset gelöst).
//
// Lauf:  node post-to-buffer.mjs <öffentliche-video-url>
// Caption kommt aus out/video-meta.json (vom video-generator geschrieben).
//
// Env:
//   BUFFER_API_KEY              Pflicht
//   BUFFER_TIKTOK_CHANNEL_ID    optional, default = byte-pulse.net TikTok

import { readFileSync } from 'node:fs';

const BUFFER_KEY = process.env.BUFFER_API_KEY;
const CHANNEL = process.env.BUFFER_TIKTOK_CHANNEL_ID || '6a106ccd090476fb994ac0fe';
const videoUrl = process.argv[2];

if (!BUFFER_KEY) { console.error('FEHLER: BUFFER_API_KEY fehlt.'); process.exit(1); }
if (!videoUrl || !/^https?:\/\//.test(videoUrl)) {
  console.error('FEHLER: öffentliche Video-URL als Argument nötig.'); process.exit(1);
}

let meta = { title: 'Tech news that matters', url: 'https://byte-pulse.net' };
try { meta = JSON.parse(readFileSync('out/video-meta.json', 'utf8')); } catch { /* default */ }

const caption =
  `${meta.title}\n\n` +
  `Full story on Byte-Pulse.Net — link in bio.\n\n` +
  `#technews #tech #ai #gadgets #breakingnews`;

// Inline-Mutation exakt nach Buffer-Doku (api.buffer.com, GraphQL).
const mutation = `mutation {
  createPost(input: {
    text: ${JSON.stringify(caption)}
    channelId: ${JSON.stringify(CHANNEL)}
    schedulingType: automatic
    mode: addToQueue
    assets: [{ video: { url: ${JSON.stringify(videoUrl)} } }]
  }) {
    ... on PostActionSuccess { post { id text } }
    ... on MutationError { message }
  }
}`;

const r = await fetch('https://api.buffer.com', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${BUFFER_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: mutation }),
});

const data = await r.json().catch(() => null);
if (!r.ok || !data) { console.error(`FEHLER: Buffer HTTP ${r.status}`); process.exit(1); }
if (data.errors) { console.error('FEHLER (GraphQL):', JSON.stringify(data.errors).slice(0, 300)); process.exit(1); }

const result = data.data?.createPost;
if (result?.message) { console.error('FEHLER (Buffer):', result.message); process.exit(1); }

console.log(`[buffer] Video in TikTok-Queue gestellt — Post-ID ${result?.post?.id || 'ok'}`);
