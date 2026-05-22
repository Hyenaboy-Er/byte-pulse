// "Byte-Pulse Nightly mit Danny Williams" — nächtliche Tech-News-Sendung.
//
// Baut aus den Top-Artikeln des Tages eine 16:9-Nachrichtensendung:
// Anchor Danny Williams (festes Portrait, rechts im Bild), links die Story
// mit Artikelbild-Hintergrund, Headline + Quelle als Bauchbinde. Danny liest
// jede Story per KI-Stimme. Intro + Stories + Outro werden als Segmente
// gerendert und zu einer Sendung zusammengefügt.
//
// Läuft KOSTENLOS auf GitHub Actions (ffmpeg vorinstalliert). Output → YouTube.
//
// Lokal: node --env-file=.env scripts/news-broadcast.mjs
// Env:
//   OPENAI_API_KEY      Pflicht (Skript + TTS)
//   SITE_URL            optional, default https://www.byte-pulse.net
//   BROADCAST_STORIES   optional, Anzahl Storys (default 8)
//   TTS_VOICE           optional, default 'onyx' (tiefe Anchor-Stimme)

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { platform } from 'node:os';

const KEY = process.env.OPENAI_API_KEY;
const SITE = (process.env.SITE_URL || 'https://www.byte-pulse.net').replace(/\/$/, '');
const STORY_COUNT = Math.max(3, Math.min(20, Number(process.env.BROADCAST_STORIES || 8)));
const VOICE = process.env.TTS_VOICE || 'onyx';
if (!KEY) { console.error('FEHLER: OPENAI_API_KEY fehlt.'); process.exit(1); }

const OUT = 'out/broadcast';
mkdirSync(OUT, { recursive: true });

// Font cross-platform (siehe video-generator.mjs).
const SRC_FONT = platform() === 'win32'
  ? 'C:/Windows/Fonts/arialbd.ttf'
  : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const FONT = `${OUT}/font.ttf`;
copyFileSync(SRC_FONT, FONT);

const DANNY = 'assets/anchor-danny.png';
if (!existsSync(DANNY)) { console.error(`FEHLER: ${DANNY} fehlt — erst scripts/generate-anchor.mjs laufen lassen.`); process.exit(1); }

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'");
}

async function download(url, path) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`download ${url} → ${r.status}`);
  writeFileSync(path, Buffer.from(await r.arrayBuffer()));
}

function ffdur(path) {
  const o = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', path]).toString().trim();
  return parseFloat(o) || 8;
}

function wrap(text, max) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.join('\n');
}

// Top-Storys der letzten 48h aus der News-Sitemap.
async function topStories(n) {
  const xml = await (await fetch(`${SITE}/news-sitemap.xml`)).text();
  const out = [];
  for (const b of xml.split('<url>').slice(1)) {
    const loc = b.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const title = b.match(/<news:title>([^<]+)<\/news:title>/)?.[1];
    const img = b.match(/<image:loc>([^<]+)<\/image:loc>/)?.[1];
    if (!loc || !title || loc.includes('/de/')) continue;
    out.push({ url: loc, title: decode(title), image: img ? decode(img) : null });
    if (out.length >= n) break;
  }
  return out;
}

// Quelle + Excerpt aus der Artikelseite.
async function enrich(a) {
  try {
    const html = await (await fetch(a.url, { signal: AbortSignal.timeout(10_000) })).text();
    a.excerpt = decode(html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i)?.[1] || '');
    a.source = decode(html.match(/Source:\s*([^<·|]{2,40})/i)?.[1] || '').trim();
  } catch { a.excerpt = ''; a.source = ''; }
  return a;
}

// KI schreibt das komplette Sendungs-Skript.
async function writeScript(stories) {
  const list = stories.map((s, i) => `${i + 1}. ${s.title}\n   ${s.excerpt || ''}`).join('\n');
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content:
          'You are the script editor for "Byte-Pulse Nightly", a tech-news TV broadcast ' +
          'hosted by anchor Danny Williams. Write in confident, clear US-English broadcast ' +
          'style — like a real evening news anchor. Return STRICT JSON:\n' +
          '{ "intro": "...", "reads": ["...", ...], "outro": "..." }\n' +
          'intro: ~35 words — Danny greets viewers, names the show, teases tonight.\n' +
          'reads: one per story, IN ORDER, ~55-75 words each, anchor delivery.\n' +
          'outro: ~30 words — sign-off, points viewers to byte-pulse.net, "goodnight".' },
        { role: 'user', content: `Tonight's stories:\n${list}` },
      ],
    }),
  });
  if (!r.ok) throw new Error(`script LLM ${r.status}`);
  const j = JSON.parse((await r.json()).choices[0].message.content);
  return j;
}

async function tts(text, path) {
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice: VOICE, input: text, response_format: 'mp3' }),
  });
  if (!r.ok) throw new Error(`TTS ${r.status}`);
  writeFileSync(path, Buffer.from(await r.arrayBuffer()));
}

// Ein Segment (Intro / Story / Outro) → eigenes 1920×1080-Clip.
function renderSegment(idx, seg) {
  const voice = `${OUT}/voice_${idx}.mp3`;
  const dur = ffdur(voice);
  const headlineFile = `${OUT}/head_${idx}.txt`;
  writeFileSync(headlineFile, wrap(seg.headline, 22));

  const inputs = [];
  let i = 0;
  if (seg.bg && existsSync(seg.bg)) { inputs.push('-loop', '1', '-i', seg.bg); }
  else { inputs.push('-f', 'lavfi', '-i', `color=c=0x0b1f3a:s=1920x1080:d=${dur}`); }
  const bgI = i++;
  inputs.push('-loop', '1', '-i', DANNY); const dannyI = i++;
  inputs.push('-i', voice); const voiceI = i++;

  const T = `fontfile=${FONT}`;
  const src = (seg.source || '').replace(/['\\]/g, '');
  let v =
    `[${bgI}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,` +
    `setsar=1,drawbox=x=0:y=0:w=1920:h=1080:color=black@0.62:t=fill[bg];` +
    `[${dannyI}:v]scale=-1:1040[danny];` +
    `[bg][danny]overlay=x=W-w-30:y=H-h[wd];` +
    `[wd]` +
    // Marken-Bar oben links
    `drawtext=${T}:text='BYTE-PULSE NIGHTLY':fontcolor=white:fontsize=40:` +
    `x=70:y=60:box=1:boxcolor=0xE5242A@0.95:boxborderw=18,` +
    // Headline links
    `drawtext=${T}:textfile=${headlineFile}:fontcolor=white:fontsize=64:` +
    `x=70:y=300:line_spacing=16:box=1:boxcolor=black@0.45:boxborderw=26` +
    (src
      ? `,drawtext=${T}:text='Source\\: ${src}':fontcolor=0xFFD24A:fontsize=34:x=72:y=760:box=1:boxcolor=black@0.6:boxborderw=12`
      : '') +
    // Bauchbinde unten
    `,drawtext=${T}:text='DANNY WILLIAMS':fontcolor=white:fontsize=38:` +
    `x=70:y=H-95:box=1:boxcolor=0x111827@0.92:boxborderw=20[v]`;

  const args = [
    '-y', ...inputs,
    '-filter_complex', `${v};[${voiceI}:a]volume=1.0,aformat=channel_layouts=stereo[a]`,
    '-map', '[v]', '-map', '[a]',
    '-t', String(dur + 0.4), '-r', '30',
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-ar', '48000',
    `${OUT}/seg_${idx}.mp4`,
  ];
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
  return dur;
}

async function main() {
  console.log('[broadcast] Top-Storys holen …');
  const stories = await topStories(STORY_COUNT);
  for (const s of stories) await enrich(s);
  console.log(`  ${stories.length} Storys`);

  console.log('[broadcast] Sendungs-Skript schreiben …');
  const script = await writeScript(stories);

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  // Segmentliste: Intro + Storys + Outro
  const segs = [];
  segs.push({ headline: `Tonight's Tech News\n${date}`, source: '', bg: null, text: script.intro });
  stories.forEach((s, n) => {
    segs.push({ headline: s.title, source: s.source, bg: `${OUT}/bg_${n}.jpg`, text: script.reads[n] || s.title, image: s.image });
  });
  segs.push({ headline: 'Goodnight.', source: '', bg: null, text: script.outro });

  // Assets pro Segment laden + TTS.
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.image) { try { await download(seg.image, seg.bg); } catch { seg.bg = null; } }
    console.log(`[broadcast] TTS Segment ${i + 1}/${segs.length} …`);
    await tts(seg.text, `${OUT}/voice_${i}.mp3`);
  }

  // Segmente rendern.
  let total = 0;
  const listLines = [];
  for (let i = 0; i < segs.length; i++) {
    console.log(`[broadcast] Render Segment ${i + 1}/${segs.length} …`);
    total += renderSegment(i, segs[i]);
    listLines.push(`file 'seg_${i}.mp4'`);
  }
  writeFileSync(`${OUT}/concat.txt`, listLines.join('\n'));

  // Zusammenfügen.
  console.log('[broadcast] Sendung zusammenfügen …');
  execFileSync('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', `${OUT}/concat.txt`,
    '-c', 'copy', `${OUT}/nightly.mp4`,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });

  const min = Math.round(total / 60 * 10) / 10;
  console.log(`[broadcast] fertig → ${OUT}/nightly.mp4 (~${min} Min, ${segs.length} Segmente)`);
}

main().catch((e) => { console.error('[broadcast] FATAL:', e.message); process.exit(1); });
