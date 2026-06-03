// Image sitemap — separate XML feed listing one <image:image> entry per
// published article. Distinct from the main /sitemap.xml because:
//   1. Google Image Search uses the Image Sitemap spec, not the URL spec.
//   2. Bulk submitting images this way unlocks Image Discovery + Google
//      News Image inclusion, which the standard URL sitemap does not.
//   3. Lets Google understand the og:image / hero image for each article
//      without having to crawl every URL twice.
//
// Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps

import { NextResponse } from 'next/server';
import { listPublished } from '@/lib/articles-source';
import { SITE } from '@/lib/site';

const SITE_URL = SITE.url.replace(/\/$/, '');

// Next.js requires `revalidate` to be a literal numeric constant, not a
// reference to another identifier. 3600 = 1h cache, plenty for an image
// sitemap (Google doesn't poll faster than daily anyway).
export const revalidate = 3600;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  let articles: Awaited<ReturnType<typeof listPublished>> = [];
  try {
    articles = await listPublished({ take: 1000 });
  } catch {
    /* snapshot fallback already inside listPublished */
  }

  const urls = articles
    .filter((a) => a.imageUrl)
    .map((a) => {
      const pageUrl = `${SITE_URL}/article/${a.slug}`;
      // Proxy image URL through our /api/og-proxy so Google sees a stable
      // SITE_URL-hosted image (the orig host may 404 over time, hurts
      // image-sitemap freshness signals).
      const imgUrl = `${SITE_URL}/api/og-proxy?url=${encodeURIComponent(a.imageUrl!)}`;
      return `  <url>
    <loc>${esc(pageUrl)}</loc>
    <image:image>
      <image:loc>${esc(imgUrl)}</image:loc>
      <image:title>${esc(a.title)}</image:title>
${a.subtitle ? `      <image:caption>${esc(a.subtitle)}</image:caption>\n` : ''}    </image:image>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
