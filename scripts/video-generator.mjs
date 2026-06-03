// Tech-Highlight Video-Generator — Artikel → 9:16-Kurzvideo für TikTok / Shorts / Reels.
//
// Läuft KOSTENLOS auf GitHub Actions (ffmpeg + Node sind auf ubuntu-latest
// vorinstalliert) — kein Vercel, kein Render-Service, keine Kosten.
//
// Pipeline:
//   1. Neuesten NOCH NICHT geposteten Top-Artikel aus der News-Sitemap holen
//      (Duplikat-Schutz über data/posted-clips.json)
//   2. KI schreibt ein knackiges ~25-Sek-Voiceover-Skript (OpenAI)
//   3. OpenAI TTS → Voiceover-MP3 (Stimme: onyx, tief/professionell)
//   4. Hero-Bild laden
//   5. ffmpeg baut 1080×1920-Video: Story oben (Bild + Headline), unten ein
//      Anchor-Band mit Danny Williams (volle Breite), Marken-Bar, CTAs
//   6. Output: out/highlight.mp4
//
// Gibt es keinen neuen Artikel, wird NICHT gerendert (kein out/highlight.mp4)
// — die GitHub Action überspringt dann Release + Auto-Post.
//
// Audio ist IMMER stereo. Musik-Bett nur wenn MUSIC_URL gesetzt ist — dann
// MUSS es eine echte Aufnahme sein (Pixabay/freesoundslibrary CC0).
//
// Env:
//   GROQ_API_KEY     Pflicht — Llama 3.3 70B für den Skript-Text (Groq Free Tier).
//   SITE_URL         optional, default https://www.byte-pulse.net
//   MUSIC_URL        optional — direkte URL zu einem CC0-Musik-Bett (stereo)
//   TTS_VOICE        optional — Edge-TTS-Stimme, default en-US-ChristopherNeural
//                    (tief / professionell, OpenAI-"onyx"-Pendant, kostenlos)
//
// TTS: edge-tts (Microsoft, kostenlos, kein API-Key) statt OpenAI TTS.
// Workflow muss `pip install edge-tts` vorher ausführen.

import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { platform } from 'node:os';

const GROQ_KEY = process.env.GROQ_API_KEY;
const SITE = (process.env.SITE_URL || 'https://www.byte-pulse.net').replace(/\/$/, '');
// Edge-TTS-Stimme — deep/professional, default ChristopherNeural (≈ OpenAI "onyx").
const VOICE = process.env.TTS_VOICE || 'en-US-ChristopherNeural';
// Groq model. llama-3.3-70b-versatile = sehr stark + im free tier hochzuverlässig.
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const MUSIC_URL = process.env.MUSIC_URL || '';
// Anchor-Portrait — muss vorhanden sein (Teil jeder Sendung UND jedes Shorts).
const DANNY = 'assets/anchor-danny.png';
// Duplikat-Schutz: schon als Video gepostete Artikel-URLs.
const STATE = 'data/posted-clips.json';
// Font für ffmpeg drawtext. Windows-Laufwerkspfade (C:\…) zerlegen den
// ffmpeg-Filtergraph (Doppelpunkt trennt Optionen) → nach out/font.ttf kopieren.
const SRC_FONT = platform() === 'win32'
  ? 'C:/Windows/Fonts/arialbd.ttf'
  : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const FONT = 'out/font.ttf';

if (!GROQ_KEY) { console.error('FEHLER: GROQ_API_KEY fehlt.'); process.exit(1); }
if (!existsSync(DANNY)) {
  console.error(`FEHLER: ${DANNY} fehlt — erst scripts/generate-anchor.mjs laufen lassen.`);
  process.exit(1);
}

const OUT = 'out';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

try {
  copyFileSync(SRC_FONT, FONT);
} catch (e) {
  console.error(`FEHLER: Font ${SRC_FONT} nicht gefunden — ${e.message}`);
  process.exit(1);
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'");
}

// 1. Neuesten EN-Artikel aus der News-Sitemap, der NICHT in postedSet ist.
async function pickArticle(postedSet) {
  const r = await fetch(`${SITE}/news-sitemap.xml`);
  if (!r.ok) throw new Error(`news-sitemap ${r.status}`);
  const xml = await r.text();
  let chosen = null;
  for (const block of xml.split('<url>').slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc || loc.includes('/de/')) continue;
    if (postedSet.has(loc)) continue;            // schon gepostet → überspringen
    chosen = { block, url: loc };
    break;
  }
  if (!chosen) return null;                       // nichts Neues
  const { block, url } = chosen;
  const title = decodeEntities(block.match(/<news:title>([^<]+)<\/news:title>/)?.[1] || 'Tech News');
  const image = block.match(/<image:loc>([^<]+)<\/image:loc>/)?.[1];
  let excerpt = '';
  try {
    const html = await (await fetch(url, { signal: AbortSignal.timeout(10_000) })).text();
    excerpt = decodeEntities(html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i)?.[1] || '');
  } catch { /* excerpt optional */ }
  return { url, title, image: image ? decodeEntities(image) : null, excerpt };
}

// 2. KI-Voiceover-Skript via Groq (Llama 3.3 70B). OpenAI-kompatible API.
async function voiceScript(article) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 200,
      messages: [
        { role: 'system', content:
          'You write 25-second voiceover scripts for a tech-news short video ' +
          '(TikTok / Reels / YouTube Shorts), delivered by anchor Danny Williams. ' +
          '55-70 words. Spoken, energetic, AMERICAN English (NOT British). The ' +
          'audience is U.S.-based — use dollar references, American slang, American ' +
          'spellings ("color", "customize", "fall"). Reference U.S. companies (Apple, ' +
          'Google, Microsoft, Meta, OpenAI) over European ones where both apply. ' +
          'Drop one explicit U.S. signal ("in America", "in the States", "U.S. ' +
          'consumers") within the first 10 words whenever the story allows. NEVER ' +
          'use hashtags or emojis. ' +
          'STRUCTURE (mandatory): ' +
          '(1) HARD HOOK in the first 1-2 seconds — e.g. "Stop scrolling." or ' +
          '"Big tech move:" or an alarming/surprising fact. The very first 5 words ' +
          'must make a thumb stop. NEVER start with "Hey guys" / "In todays world" / ' +
          '"Welcome back". ' +
          '(2) Why it matters in one plain-language beat. ' +
          '(3) Close with a CLEAR subscribe call — e.g. "Follow Byte-Pulse for daily tech" ' +
          'or "Hit follow, Byte-Pulse drops a story like this every day." ' +
          'Output ONLY the script text — no preamble, no quotation marks, no labels.' },
        { role: 'user', content:
          `Headline: ${article.title}\nSummary: ${article.excerpt || '(none)'}` },
      ],
    }),
  });
  if (!r.ok) throw new Error(`script LLM (Groq) ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  // Llama sometimes echos a quoted script — strip leading/trailing quotes + labels.
  let script = (data.choices?.[0]?.message?.content || article.title).trim();
  script = script.replace(/^["'`]+|["'`]+$/g, '').trim();
  script = script.replace(/^(script|voiceover|here['']s [^:]+):?\s*/i, '').trim();
  return script;
}

// 3. Edge-TTS (Microsoft, kostenlos, kein API-Key) — MP3 via Python CLI.
async function tts(text, path) {
  // Write script to a temp file so we don't have to deal with shell escaping
  // of multi-line or special-char text on Windows / Bash on Linux runners.
  const tmpScript = `${OUT}/_voice-script.txt`;
  writeFileSync(tmpScript, text);
  try {
    execFileSync('edge-tts', ['--voice', VOICE, '--file', tmpScript, '--write-media', path], {
      stdio: 'inherit',
    });
  } catch (e) {
    throw new Error(`Edge-TTS failed: ${e.message}. Is 'pip install edge-tts' done?`);
  }
  if (!existsSync(path)) throw new Error('Edge-TTS produced no output file');
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

// Headline auf ~17 Zeichen/Zeile umbrechen, max 5 Zeilen.
function wrapHeadline(title) {
  const words = title.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 17 && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 5).join('\n');
}

async function main() {
  // Duplikat-Schutz: bereits gepostete Artikel laden.
  let posted = [];
  try { posted = JSON.parse(readFileSync(STATE, 'utf8')); } catch { /* erste Ausführung */ }
  const postedSet = new Set(posted);

  console.log('[video] neuesten ungeposteten Artikel suchen …');
  const article = await pickArticle(postedSet);
  if (!article) {
    console.log('[video] nichts Neues — alle aktuellen Artikel sind schon als Video gepostet.');
    console.log('[video] kein Render, kein Post. (Das ist KEIN Fehler.)');
    process.exit(0);   // kein out/highlight.mp4 → Workflow überspringt Release + Post
  }
  console.log('  ' + article.title);

  console.log('[video] Voiceover-Skript schreiben …');
  const script = await voiceScript(article);

  console.log('[video] TTS rendern …');
  await tts(script, `${OUT}/voice.mp3`);
  const dur = Math.min(ffprobeDuration(`${OUT}/voice.mp3`) + 0.8, 60);

  console.log('[video] Hero-Bild laden …');
  if (article.image) {
    try { await download(article.image, `${OUT}/hero.jpg`); }
    catch (e) { console.warn('  Hero-Bild-Fehler, Schwarz-Fallback:', e.message); }
  }

  // Homepage-Logo (apple-icon) für den Kopfbereich.
  let hasLogo = false;
  try { await download(`${SITE}/apple-icon`, `${OUT}/logo.png`); hasLogo = true; }
  catch (e) { console.warn('  Logo-Download-Fehler, ohne Logo:', e.message); }

  // Musik-Bett (optional, echte CC0-Aufnahme, stereo).
  let hasMusic = false;
  if (MUSIC_URL) {
    try { await download(MUSIC_URL, `${OUT}/music.mp3`); hasMusic = true; }
    catch (e) { console.warn('  Musik-Download-Fehler, Voiceover-only:', e.message); }
  }

  writeFileSync(`${OUT}/headline.txt`, wrapHeadline(article.title));
  writeFileSync(`${OUT}/url.txt`, 'https://www.byte-pulse.net/');

  // ── ffmpeg-Filter ──────────────────────────────────────────────────────
  // Input-Reihenfolge ist dynamisch (Logo/Musik optional) — Indizes mitzählen.
  const inputs = [];
  let i = 0;
  if (existsSync(`${OUT}/hero.jpg`)) inputs.push('-loop', '1', '-i', `${OUT}/hero.jpg`);
  else inputs.push('-f', 'lavfi', '-i', `color=c=0x0a0a12:s=1080x1920:d=${dur}`);
  const heroI = i++;
  let logoI = -1;
  if (hasLogo && existsSync(`${OUT}/logo.png`)) {
    inputs.push('-loop', '1', '-i', `${OUT}/logo.png`); logoI = i++;
  }
  inputs.push('-loop', '1', '-i', DANNY); const dannyI = i++;
  inputs.push('-i', `${OUT}/voice.mp3`); const voiceI = i++;
  let musicI = -1;
  if (hasMusic) { inputs.push('-i', `${OUT}/music.mp3`); musicI = i++; }

  // Story-Hero mit Ken-Burns-Zoom + Vignette (cinematisch).
  const frames = Math.round(dur * 30);
  let v = `[${heroI}:v]scale=2160:3840:force_original_aspect_ratio=increase,` +
          `crop=2160:3840,zoompan=z='min(zoom+0.00015,1.14)':d=${frames}:` +
          `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,` +
          `setsar=1,drawbox=x=0:y=0:w=1080:h=1920:color=black@0.5:t=fill,vignette[bg]`;
  let stage = '[bg]';
  if (logoI >= 0) {
    v += `;[${logoI}:v]scale=165:-1[logo];${stage}[logo]overlay=x=(W-w)/2:y=46[wl]`;
    stage = '[wl]';
  }
  // Danny Williams als Anchor-Band unten — volle Breite, Kopf + Schultern.
  v += `;[${dannyI}:v]scale=1080:-1,crop=1080:820:0:110[danny];` +
       `${stage}[danny]overlay=x=0:y=1100[wd]`;
  stage = '[wd]';

  const T = `fontfile=${FONT}`;
  v += `;${stage}` +
    // Volle URL in der roten Marken-Bar (oben)
    `drawtext=${T}:textfile=${OUT}/url.txt:fontcolor=white:fontsize=34:` +
    `x=(w-text_w)/2:y=196:box=1:boxcolor=0xE5242A@0.96:boxborderw=16,` +
    // Headline (Story-Bereich oben)
    `drawtext=${T}:textfile=${OUT}/headline.txt:fontcolor=white:fontsize=62:` +
    `x=(w-text_w)/2:y=322:line_spacing=18:box=1:boxcolor=black@0.42:boxborderw=28,` +
    // Artikel-CTA, direkt über dem Anchor-Band
    `drawtext=${T}:text='Read the full article':fontcolor=white:fontsize=42:` +
    `x=(w-text_w)/2:y=1004:box=1:boxcolor=black@0.62:boxborderw=18,` +
    // Roter Trennstrich zwischen Story und Anchor-Band
    `drawbox=x=0:y=1096:w=1080:h=6:color=0xE5242A,` +
    // Bauchbinde: Anchor-Name (links) + Abo-Hinweis (rechts) auf JEDEM Video
    `drawtext=${T}:text='DANNY WILLIAMS':fontcolor=white:fontsize=36:` +
    `x=42:y=1798:box=1:boxcolor=0x111827@0.92:boxborderw=18,` +
    `drawtext=${T}:text='SUBSCRIBE':fontcolor=white:fontsize=36:` +
    `x=w-text_w-42:y=1798:box=1:boxcolor=0xE5242A@0.97:boxborderw=18[v]`;

  const audioParts = [`[${voiceI}:a]volume=1.0,aformat=channel_layouts=stereo[vo]`];
  let audioMap = '[vo]';
  if (musicI >= 0) {
    audioParts.push(`[${musicI}:a]volume=0.14,aformat=channel_layouts=stereo[mus]`);
    audioParts.push(`[vo][mus]amix=inputs=2:duration=first:dropout_transition=0[a]`);
    audioMap = '[a]';
  }

  const args = [
    '-y', ...inputs,
    '-filter_complex', `${v};${audioParts.join(';')}`,
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

  // Metadaten für den Auto-Upload (Caption-Quelle für post-to-buffer.mjs).
  writeFileSync(`${OUT}/video-meta.json`, JSON.stringify({
    title: article.title,
    url: article.url,
    excerpt: article.excerpt || '',
    category: article.category || '',
  }));

  // Duplikat-Schutz fortschreiben (letzte 60 Artikel behalten).
  posted.push(article.url);
  mkdirSync('data', { recursive: true });
  writeFileSync(STATE, JSON.stringify(posted.slice(-60), null, 2) + '\n');
  console.log('[video] data/posted-clips.json aktualisiert.');
}

main().catch((e) => { console.error('[video] FATAL:', e.message); process.exit(1); });
