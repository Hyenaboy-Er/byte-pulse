import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'TechPuls';
const TAGLINE = process.env.NEXT_PUBLIC_SITE_TAGLINE ?? 'Tech-News, Gaming, KI – alles was heute zählt.';

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET() {
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  });

  const items = articles.map((a) => `
    <item>
      <title>${escape(a.title)}</title>
      <link>${SITE_URL}/article/${a.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/article/${a.slug}</guid>
      <description>${escape(a.excerpt)}</description>
      <category>${escape(a.category)}</category>
      <pubDate>${(a.publishedAt ?? a.createdAt).toUTCString()}</pubDate>
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escape(TAGLINE)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 's-maxage=300' },
  });
}
