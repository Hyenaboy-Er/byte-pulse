// Google News-specific sitemap. Submitted separately in Google News Publisher Center.
// Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
// Only articles published in the last 48 hours, with <news:news> markup.

import { listRecentForNewsSitemap } from '@/lib/articles-source';
import { SITE } from '@/lib/site';

// Was force-dynamic — every request was hitting Turso and burning quota.
// Now ISR with a 15 min revalidate: Google News crawls this every few
// minutes, but our DB only sees ~4 reads/hr instead of one per request.
export const revalidate = 900;

// Single-sourced from the keystone. The old `process.env.X ?? '...'`
// reads broke on Vercel where NEXT_PUBLIC_SITE_URL/NAME are '' (empty
// string ≠ undefined, so `??` did NOT fall back): the news sitemap
// emitted apex URLs that 308-redirect to www AND an empty <news:name>.
// site.ts's env() helper treats '' as missing → correct www + brand.
const SITE_URL = SITE.url;
const SITE_NAME = SITE.name;

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  // listRecentForNewsSitemap falls back to the snapshot when Turso is read-blocked.
  const articles = await listRecentForNewsSitemap(48);
  const trMap = new Map<string, { title: string }>(); // DE layer deleted

  const enEntries = articles.map((a) => `
  <url>
    <loc>${SITE_URL}/article/${a.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${escape(SITE_NAME)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${(a.publishedAt ?? a.createdAt).toISOString()}</news:publication_date>
      <news:title>${escape(a.title)}</news:title>
    </news:news>
    ${a.imageUrl ? `<image:image><image:loc>${escape(a.imageUrl)}</image:loc></image:image>` : ''}
  </url>`).join('\n');

  // DE layer off → no German URLs in the news sitemap at all.
  const deEntries = !SITE.deEnabled ? '' : articles
    .filter((a) => trMap.has(a.id))
    .map((a) => {
      const tr = trMap.get(a.id)!;
      return `
  <url>
    <loc>${SITE_URL}/de/article/${a.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${escape(SITE_NAME)}</news:name>
        <news:language>de</news:language>
      </news:publication>
      <news:publication_date>${(a.publishedAt ?? a.createdAt).toISOString()}</news:publication_date>
      <news:title>${escape(tr.title)}</news:title>
    </news:news>
    ${a.imageUrl ? `<image:image><image:loc>${escape(a.imageUrl)}</image:loc></image:image>` : ''}
  </url>`;
    }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${enEntries}
${deEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 's-maxage=300, stale-while-revalidate=600',
    },
  });
}
