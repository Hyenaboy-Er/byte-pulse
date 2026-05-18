import { prisma } from '@/lib/db';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

// Single-sourced from the keystone (fixes empty-env localhost fallback).
const SITE_URL = SITE.url;
const SITE_NAME = SITE.name;

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET() {
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  });

  const ids = articles.map((a) => a.id);
  const trs = ids.length
    ? await prisma.translation.findMany({ where: { articleId: { in: ids }, lang: 'de' } })
    : [];
  const trMap = new Map(trs.map((t) => [t.articleId, t]));

  const items = articles.map((a) => {
    const tr = trMap.get(a.id);
    const title = tr?.title ?? a.title;
    const description = tr?.excerpt ?? a.excerpt;
    return `
    <item>
      <title>${escape(title)}</title>
      <link>${SITE_URL}/de/article/${a.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/de/article/${a.slug}</guid>
      <description>${escape(description)}</description>
      <category>${escape(a.category)}</category>
      <pubDate>${(a.publishedAt ?? a.createdAt).toUTCString()}</pubDate>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(SITE_NAME)} – Deutsch</title>
    <link>${SITE_URL}/de</link>
    <description>Tech-News, Gaming, KI – das Wichtigste auf Deutsch.</description>
    <language>de-de</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 's-maxage=300' },
  });
}
