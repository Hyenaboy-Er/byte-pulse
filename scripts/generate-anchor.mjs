// Erzeugt das Anchor-Portrait für die Byte-Pulse-Nachrichtensendung.
//
// "Danny Williams" ist eine FIKTIVE Moderatoren-Figur (kein echter Mensch) —
// 35, afroamerikanisch, Chicago, Brille, Anzug + Krawatte. Das Bild wird
// EINMAL erzeugt und danach von jedem Sendungs-Render wiederverwendet, damit
// der Anchor immer gleich aussieht.
//
// Lauf: node --env-file=.env scripts/generate-anchor.mjs
// Output: assets/anchor-danny.png

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('FEHLER: OPENAI_API_KEY fehlt.'); process.exit(1); }

const PROMPT =
  'Professional television news studio portrait of a fictional news anchor. ' +
  'A confident 35-year-old African American man from Chicago, short neat hair, ' +
  'short well-groomed beard, modern rectangular glasses, wearing a dark navy ' +
  'business suit with a white shirt and a deep-red tie. Friendly, trustworthy, ' +
  'authoritative expression, looking straight at the camera. Seated at a sleek ' +
  'modern news desk. Clean studio lighting, slight depth-of-field, photorealistic, ' +
  'sharp, high detail. Framed from chest up, centered, vertical portrait.';

const OUT = 'assets';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const r = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-image-1',
    prompt: PROMPT,
    size: '1024x1536',
    quality: 'high',
    n: 1,
  }),
});

if (!r.ok) {
  console.error(`FEHLER: Bild-API ${r.status}: ${(await r.text()).slice(0, 300)}`);
  process.exit(1);
}

const data = await r.json();
const b64 = data?.data?.[0]?.b64_json;
if (!b64) { console.error('FEHLER: keine Bilddaten in der Antwort.'); process.exit(1); }

writeFileSync(`${OUT}/anchor-danny.png`, Buffer.from(b64, 'base64'));
console.log(`fertig → ${OUT}/anchor-danny.png`);
