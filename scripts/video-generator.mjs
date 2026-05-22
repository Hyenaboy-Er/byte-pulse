// Tech-Highlight Video-Generator — Artikel → 9:16-Kurzvideo für TikTok / Shorts / Reels.
//
// Läuft KOSTENLOS auf GitHub Actions (ffmpeg + Node sind auf ubuntu-latest
// vorinstalliert) — kein Vercel, kein Render-Service, keine Kosten.
//
// Pipeline:
//   1. Neuesten Top-Artikel aus der News-Sitemap holen (Titel, Bild, Excerpt)
//   2. KI schreibt ein knackiges 25-Sek-Voiceover-Skript (OpenAI)
//   3. OpenAI TTS → Voiceover-MP3 (Stimme: onyx, tief/professionell)
//   4. Hero-Bild laden
//   5. ffmpeg baut 1080×1920-Video: Bild abgedunkelt, Marken-Bar,
//      Headline groß, Voiceover + optionaler Musik-Bett (stereo)
//   6. Output: out/highlight.mp4 (GitHub Action lädt es als Artifact hoch)
//
// Audio ist IMMER stereo. Musik-Bett nur wenn MUSIC_URL gesetzt ist — dann
// MUSS es eine echte Aufnahme sein (Pixabay/freesoundslibrary CC0), niemals
// synthetisch generiertes Rauschen.
//
// Env:
//   OPENAI_API_KEY   Pflicht — Skript-Text + TTS
//   SITE_URL         optional, default https://www.byte-pulse.net
//   TTS_VOICE        optional, default 'onyx'
//   MUSIC_URL        optional — direkte URL zu einem CC0-Musik-Bett (stereo)

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SITE = (process.env.SITE_URL || 'https://www.byte-pulse.net').replace(/\/$/, '');
const VOICE = process.env.TTS_VOICE || 'onyx';
const MUSIC_URL = process.env.MUSIC_URL || '';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

if (!OPENAI_KEY) { console.error('FEHLER: OPENAI_API_KEY fehlt.'); process.exit(1); }

const OUT = 'out';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'");
}

// 1. Neuesten Artikel aus der News-Sitemap.
async function latestArticle() {
  const r = await fetch(`${SITE}/news-sitemap.xml`);
  if (!r.ok) throw new Error(`news-sitemap ${r.status}`);
  const xml = await r.text();
  const block = xml.split('<url>').slice(1).find((b) => {
    const loc = b.match(/<loc>([^<]+)<\/loc>/)?.[1];
    return loc && !loc.includes('/de/');
  });
  if (!block) throw new Error('kein EN-Artikel in Sitemap');
  const url = block.match(/<loc>([^<]+)<\/loc>/)[1];
  const title = decodeEntities(block.match(/<news:title>([^<]+)<\/news:title>/)?.[1] || 'Tech News');
  const image = block.match(/<image:loc>([^<]+)<\/image:loc>/)?.[1];
  // Excerpt aus der Artikelseite (og:description)
  let excerpt = '';
  try {
    const html = await (await fetch(url, { signal: AbortSignal.timeout(10_000) })).text();
    excerpt = decodeEntities(html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i)?.[1] || '');
  } catch { /* excerpt optional */ }
  return { url, title, image: image ? decodeEntities(image) : null, excerpt };
}

// 2. KI-Voiceover-Skript — knapp, gesprochen, ~25 Sek.
async function voiceScript(article) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content:
          'You write punchy 25-second voiceover scripts for a tech-news short video ' +
          '(TikTok/Reels/Shorts). 55-70 words. Spoken, energetic, plain English. ' +
          'Hook in the first sentence. No hashtags, no emojis, no "link in bio". ' +
          'End on why it matters. Output ONLY the script text.' },
        { role: 'user', content:
          `Headline: ${article.title}\nSummary: ${article.excerpt || '(none)'}` },
      ],
    }),
  });
  if (!r.ok) throw new Error(`script LLM ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const data = await r.json();
  return (data.choices?.[0]?.message?.content || article.title).trim();
}

// 3. OpenAI TTS → MP3.
async function tts(text, path) {
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice: VOICE, input: text, response_format: 'mp3' }),
  });
  if (!r.ok) throw new Error(`TTS ${r.status}: ${(await r.text()).slice(0, 150)}`);
  writeFileSync(path, Buffer.from(await r.arrayBuffer()));
}

async function download(url, path) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`download ${url} → ${r.status}`);
  writeFileSync(path, Buffer.from(await r.arrayBuffer()));
}

function ffprobeDuration(path) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', path,
  ]).toString().trim();
  return parseFloat(out) || 25;
}

// Headline auf ~16 Zeichen/Zeile umbrechen, max 5 Zeilen.
function wrapHeadline(title) {
  const words = title.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 16 && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 5).join('\n');
}

async function main() {
  console.log('[video] neuesten Artikel holen …');
  const article = await latestArticle();
  console.log('  ' + article.title);

  console.log('[video] Voiceover-Skript schreiben …');
  const script = await voiceScript(article);

  console.log('[video] TTS rendern …');
  await tts(script, `${OUT}/voice.mp3`);
  const dur = Math.min(ffprobeDuration(`${OUT}/voice.mp3`) + 0.8, 60);

  console.log('[video] Hero-Bild laden …');
  const heroOk = !!article.image;
  if (heroOk) {
    try { await download(article.image, `${OUT}/hero.jpg`); }
    catch (e) { console.warn('  Hero-Bild-Fehler, Schwarz-Fallback:', e.message); }
  }

  // Musik-Bett (optional, echte CC0-Aufnahme, stereo).
  let hasMusic = false;
  if (MUSIC_URL) {
    try { await download(MUSIC_URL, `${OUT}/music.mp3`); hasMusic = true; }
    catch (e) { console.warn('  Musik-Download-Fehler, Voiceover-only:', e.message); }
  }

  writeFileSync(`${OUT}/headline.txt`, wrapHeadline(article.title));

  // ── ffmpeg-Filter ──────────────────────────────────────────────────────
  const inputs = [];
  if (existsSync(`${OUT}/hero.jpg`)) inputs.push('-loop', '1', '-i', `${OUT}/hero.jpg`);
  else inputs.push('-f', 'lavfi', '-i', `color=c=0x0a0a12:s=1080x1920:d=${dur}`);
  inputs.push('-i', `${OUT}/voice.mp3`);
  if (hasMusic) inputs.push('-i', `${OUT}/music.mp3`);

  const vf =
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,` +
    `drawbox=x=0:y=0:w=1080:h=1920:color=black@0.5:t=fill,` +
    `drawtext=fontfile=${FONT}:text='BYTE-PULSE':fontcolor=white:fontsize=44:` +
    `x=(w-text_w)/2:y=150:box=1:boxcolor=0xE5242A@0.92:boxborderw=22,` +
    `drawtext=fontfile=${FONT}:textfile=${OUT}/headline.txt:fontcolor=white:fontsize=80:` +
    `x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=20:box=1:boxcolor=black@0.38:boxborderw=34,` +
    `drawtext=fontfile=${FONT}:text='byte-pulse.net':fontcolor=white@0.92:fontsize=40:` +
    `x=(w-text_w)/2:y=h-230[v]`;

  const audioParts = [`[1:a]volume=1.0,aformat=channel_layouts=stereo[vo]`];
  let audioMap = '[vo]';
  if (hasMusic) {
    audioParts.push(`[2:a]volume=0.14,aformat=channel_layouts=stereo[mus]`);
    audioParts.push(`[vo][mus]amix=inputs=2:duration=first:dropout_transition=0[a]`);
    audioMap = '[a]';
  }

  const args = [
    '-y', ...inputs,
    '-filter_complex', `${vf};${audioParts.join(';')}`,
    '-map', '[v]', '-map', audioMap,
    '-t', String(dur), '-r', '30',
    '-c:v', 'libx264', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
    `${OUT}/highlight.mp4`,
  ];

  console.log('[video] ffmpeg rendert …');
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  console.log(`[video] fertig → ${OUT}/highlight.mp4 (${dur.toFixed(1)}s)`);
  console.log(`[video] Artikel: ${article.url}`);
}

main().catch((e) => { console.error('[video] FATAL:', e.message); process.exit(1); });
