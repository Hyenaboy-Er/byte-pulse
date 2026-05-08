import { prisma } from '@/lib/db';
import { getCategory } from '@/lib/categories';

export const dynamic = 'force-dynamic';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'TechPuls';

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (next.length > maxChars && cur) { lines.push(cur); cur = w; if (lines.length >= maxLines - 1) break; }
    else cur = next;
  }
  if (cur) lines.push(cur);
  if (words.length && lines.length === maxLines && (lines.join(' ').length < text.length - 3)) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/\s\S+$/, '') + '…';
  }
  return lines.slice(0, maxLines);
}

export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const a = await prisma.article.findUnique({ where: { slug } });
  if (!a) return new Response('Not found', { status: 404 });
  const cat = getCategory(a.category);

  const lines = wrap(a.title, 28, 4);
  const titleY = 320 - (lines.length - 1) * 38;
  const tspans = lines.map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : 76}">${escapeXml(l)}</tspan>`).join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0f"/>
      <stop offset="100%" stop-color="#1a0a1a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.2" cy="0.2" r="0.6">
      <stop offset="0%" stop-color="${cat?.color ?? '#ff3366'}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${cat?.color ?? '#ff3366'}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <text x="80" y="120" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="28" font-weight="800" fill="${cat?.color ?? '#ff3366'}" letter-spacing="3">
    ${escapeXml((cat?.name ?? '').toUpperCase())}
  </text>
  <text x="80" y="${titleY}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="68" font-weight="900" fill="#ffffff" letter-spacing="-1.5">
    ${tspans}
  </text>
  <line x1="80" y1="540" x2="1120" y2="540" stroke="#ffffff" stroke-opacity="0.1"/>
  <text x="80" y="585" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="26" font-weight="900" fill="#ffffff">
    ${escapeXml(SITE_NAME)} <tspan fill="#ff3366">●</tspan>
  </text>
  <text x="1120" y="585" text-anchor="end" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="20" fill="#7a7a8c">
    Quelle: ${escapeXml(a.sourceName)}
  </text>
</svg>`;

  return new Response(svg, {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=86400, immutable' },
  });
}
