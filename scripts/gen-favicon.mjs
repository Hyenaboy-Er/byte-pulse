// Generates a real binary favicon.ico (PNG-embedded ICO format) at src/app/favicon.ico.
// Run via: node scripts/gen-favicon.mjs
// Uses zero deps by drawing on a Canvas-like approach via a manually built PNG.
//
// Output: 32x32 PNG embedded in ICO. Brand: dark bg (#0a0a0f), red 'B' (#ff3366), red dot.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Build a 32x32 RGBA pixel buffer.
const W = 32;
const H = 32;
const px = Buffer.alloc(W * H * 4);
const setPx = (x, y, r, g, b, a = 255) => {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
};
// Background dark
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) setPx(x, y, 0x0a, 0x0a, 0x0f);
// Rounded-corner mask (clip 4 corners)
const cornerR = 5;
const insideRoundRect = (x, y) => {
  const dx = x < cornerR ? cornerR - x : (x > W - 1 - cornerR ? x - (W - 1 - cornerR) : 0);
  const dy = y < cornerR ? cornerR - y : (y > H - 1 - cornerR ? y - (H - 1 - cornerR) : 0);
  return dx * dx + dy * dy <= cornerR * cornerR;
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!insideRoundRect(x, y)) setPx(x, y, 0, 0, 0, 0);
// Red dot top-right (live indicator)
const dotCx = 25, dotCy = 7, dotR = 3;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const d = (x - dotCx) * (x - dotCx) + (y - dotCy) * (y - dotCy);
  if (d <= dotR * dotR && insideRoundRect(x, y)) setPx(x, y, 0xff, 0x33, 0x66);
}
// Letter 'B' as a chunky bitmap. 8x12 grid scaled to fit ~14x18 in the icon.
// Using a hand-tuned 7x9 'B' bitmap, rendered scaled 2x.
const B = [
  '111110.',
  '1....11',
  '1....11',
  '1...11.',
  '111110.',
  '1...11.',
  '1....11',
  '1....11',
  '111110.',
];
const bw = B[0].length, bh = B.length;
const scale = 2;
const ox = Math.floor((W - bw * scale) / 2);
const oy = Math.floor((H - bh * scale) / 2) + 1;
for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
  if (B[by][bx] !== '1') continue;
  for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
    const x = ox + bx * scale + dx, y = oy + by * scale + dy;
    if (insideRoundRect(x, y)) setPx(x, y, 0xff, 0x33, 0x66);
  }
}

// Encode RGBA buffer → PNG (no deps, raw deflate).
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
// Filter byte (0=None) per row + RGBA pixels
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0;
  px.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}
const idat = deflateSync(raw);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

// Wrap in ICO (PNG-embedded). ICO header (6) + ICONDIRENTRY (16) + PNG.
const ico = Buffer.alloc(6 + 16 + png.length);
ico.writeUInt16LE(0, 0); // reserved
ico.writeUInt16LE(1, 2); // type 1 = ICO
ico.writeUInt16LE(1, 4); // 1 image
ico[6] = W >= 256 ? 0 : W;  // width (0 = 256)
ico[7] = H >= 256 ? 0 : H;  // height
ico[8] = 0; // colors in palette (0 for >=8bpp)
ico[9] = 0; // reserved
ico.writeUInt16LE(1, 10);   // color planes
ico.writeUInt16LE(32, 12);  // bpp
ico.writeUInt32LE(png.length, 14);
ico.writeUInt32LE(22, 18);  // offset to image data
png.copy(ico, 22);

const outPath = join(__dirname, '..', 'src', 'app', 'favicon.ico');
writeFileSync(outPath, ico);
console.log(`wrote ${outPath} (${ico.length} bytes, png inside ${png.length} bytes)`);
