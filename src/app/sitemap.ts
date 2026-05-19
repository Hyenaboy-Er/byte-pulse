import { prisma } from '@/lib/db';
import { CATEGORIES } from '@/lib/categories';
import { SITE } from '@/lib/site';
import type { MetadataRoute } from 'next';

// Single-sourced from the keystone. site.ts's env() helper correctly
// handles an empty NEXT_PUBLIC_SITE_URL (falls back), unlike the old
// `?? 'http://localhost:3000'` which `??` does NOT trigger on '' —
// that produced broken/redirecting URLs in the live sitemap.
const SITE_URL = SITE.url;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await prisma.article.findMany({
    // qualityScore >= 0 excludes thin-pruner-deindexed legacy articles —
    // don't tell Google to index pages we explicitly noindex.
    where: { status: 'published', qualityScore: { gte: 0 } },
    select: { id: true, slug: true, updatedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: 1000,
  });

  // Look up which articles have a German translation. We only emit /de/article/<slug>
  // into the sitemap once the translation exists — otherwise Google indexes the
  // English fallback content under the /de URL and flags it as a duplicate.
  const translated = await prisma.translation.findMany({
    where: { lang: 'de', articleId: { in: articles.map((a) => a.id) } },
    select: { articleId: true },
  });
  // DE layer is off (SITE.deEnabled=false) → never list /de in the
  // sitemap (don't ask Google to index the de-indexed German layer).
  const deOn = SITE.deEnabled;
  const hasGerman = new Set(deOn ? translated.map((t) => t.articleId) : []);

  const articleUrls = articles.flatMap((a) => {
    const enAlt = `${SITE_URL}/article/${a.slug}`;
    const deAlt = `${SITE_URL}/de/article/${a.slug}`;
    const entries: MetadataRoute.Sitemap = [
      {
        url: enAlt,
        lastModified: a.updatedAt,
        changeFrequency: 'hourly' as const,
        priority: 0.8,
        alternates: hasGerman.has(a.id)
          ? { languages: { en: enAlt, de: deAlt } }
          : { languages: { en: enAlt } },
      },
    ];
    if (hasGerman.has(a.id)) {
      entries.push({
        url: deAlt,
        lastModified: a.updatedAt,
        changeFrequency: 'hourly' as const,
        priority: 0.7,
        alternates: { languages: { en: enAlt, de: deAlt } },
      });
    }
    return entries;
  });

  const categoryUrls = CATEGORIES.flatMap((c) => [
    { url: `${SITE_URL}/category/${c.slug}`, lastModified: new Date(), changeFrequency: 'hourly' as const, priority: 0.6 },
    ...(deOn
      ? [{ url: `${SITE_URL}/de/category/${c.slug}`, lastModified: new Date(), changeFrequency: 'hourly' as const, priority: 0.55 }]
      : []),
  ]);

  return [
    { url: SITE_URL,            lastModified: new Date(), changeFrequency: 'hourly',  priority: 1 },
    ...(deOn ? [{ url: `${SITE_URL}/de`, lastModified: new Date(), changeFrequency: 'hourly' as const, priority: 0.95 }] : []),
    { url: `${SITE_URL}/newsletter`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...categoryUrls,
    ...articleUrls,
  ];
}
