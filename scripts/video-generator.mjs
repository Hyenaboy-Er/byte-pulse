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
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { platform } from 'node:os';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SITE = (process.env.SITE_URL || 'https://www.byte-pulse.net').replace(/\/$/, '');
// Feste Byte-Pulse-Stimme (onyx) — überall identisch, Marken-Konsistenz.
const VOICE = 'onyx';
const MUSIC_URL = process.env.MUSIC_URL || '';
// Font für ffmpeg drawtext. Windows-Laufwerkspfade (C:\…) zerlegen den
// ffmpeg-Filtergraph (der Doppelpunkt trennt Optionen). Lösung: den Quell-
// Font nach out/font.ttf kopieren und im Filter nur den relativen Pfad
// out/font.ttf benutzen — kein Doppelpunkt, funktioniert Windows + Linux.
const SRC_FONT = platform() === 'win32'
  ? 'C:/Windows/Fonts/arialbd.ttf'
  : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const FONT = 'out/font.ttf';

if (!OPENAI_KEY) { console.error('FEHLER: OPENAI_API_KEY fehlt.'); process.exit(1); }

const OUT = 'out';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// Font in den Arbeitsordner kopieren (relativer, doppelpunktfreier Pfad).
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
          '(TikTok/Reels/Shorts). 55-70 words. Spoken, energetic, US English. ' +
          'Hook in the first sentence. No hashtags, no emojis. Cover why it matters, ' +
          'then end by telling viewers to read the full story on Byte-Pulse dot net. ' +
          'Output ONLY the script text.' },
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
  inputs.push('-i', `${OUT}/voice.mp3`); const voiceI = i++;
  let musicI = -1;
  if (hasMusic) { inputs.push('-i', `${OUT}/music.mp3`); musicI = i++; }

  // Video: Hero mit langsamem Ken-Burns-Zoom + Vignette (cinematisch,
  // hebt statisches Foto auf Profi-Niveau) → Logo-Overlay → Text-Overlays.
  const frames = Math.round(dur * 30);
  let v = `[${heroI}:v]scale=2160:3840:force_original_aspect_ratio=increase,` +
          `crop=2160:3840,zoompan=z='min(zoom+0.00015,1.14)':d=${frames}:` +
          `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,` +
          `setsar=1,drawbox=x=0:y=0:w=1080:h=1920:color=black@0.5:t=fill,vignette[bg]`;
  let stage = '[bg]';
  if (logoI >= 0) {
    v += `;[${logoI}:v]scale=180:-1[logo];${stage}[logo]overlay=x=(W-w)/2:y=70[wl]`;
    stage = '[wl]';
  }
  const T = `fontfile=${FONT}`;
  v += `;${stage}` +
    // Volle URL in der roten Bar (oben, unter dem Logo)
    `drawtext=${T}:textfile=${OUT}/url.txt:fontcolor=white:fontsize=36:` +
    `x=(w-text_w)/2:y=275:box=1:boxcolor=0xE5242A@0.96:boxborderw=18,` +
    // Headline (Mitte)
    `drawtext=${T}:textfile=${OUT}/headline.txt:fontcolor=white:fontsize=76:` +
    `x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=20:box=1:boxcolor=black@0.42:boxborderw=32,` +
    // Hinweis auf den Artikel (unten, zentriert)
    `drawtext=${T}:text='Read the full article':fontcolor=white:fontsize=46:` +
    `x=(w-text_w)/2:y=h-400:box=1:boxcolor=black@0.6:boxborderw=22,` +
    // Abo-Button (unten rechts, rot, button-artig)
    `drawtext=${T}:text='SUBSCRIBE':fontcolor=white:fontsize=46:` +
    `x=w-text_w-70:y=h-210:box=1:boxcolor=0xE5242A@0.96:boxborderw=28[v]`;

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
}

main().catch((e) => { console.error('[video] FATAL:', e.message); process.exit(1); });
