// PWA manifest for installability + iOS home-screen support.
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json({
    name: 'Byte-Pulse',
    short_name: 'Byte-Pulse',
    description: 'Latest tech news — AI, gaming, hardware, mobile, software, security. Bilingual EN/DE.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#ff3366',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
}
