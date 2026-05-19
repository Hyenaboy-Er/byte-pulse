// Google News-specific sitemap. Submitted separately in Google News Publisher Center.
// Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
// Only articles published in the last 48 hours, with <news:news> markup.

import { prisma } from '@/lib/db';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

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
  const cutoff = new Date(Date.now() - 48 * 3600_000); // last 48h
  const articles = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: cutoff }, qualityScore: { gte: 0 } },
    orderBy: { publishedAt: 'desc' },
    take: 1000, // Google News allows up to 1000 per sitemap
  });

  // For DE versions we list separately (Google News supports multiple language editions)
  const ids = articles.map((a) => a.id);
  const trs = ids.length
    ? await prisma.translation.findMany({ where: { articleId: { in: ids }, lang: 'de' } })
    : [];
  const trMap = new Map(trs.map((t) => [t.articleId, t]));

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
