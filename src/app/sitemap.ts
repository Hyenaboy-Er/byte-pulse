import { listPublished } from '@/lib/articles-source';
import { CATEGORIES } from '@/lib/categories';
import { SITE } from '@/lib/site';
import type { MetadataRoute } from 'next';

const SITE_URL = SITE.url;

// DE layer was deleted by the user — never emit /de URLs into the sitemap
// regardless of past schema or SITE flag.
const deOn = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // listPublished falls back to the static snapshot when Turso is read-blocked.
  const articles = await listPublished({ take: 1000 });
  const hasGerman = new Set<string>();

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
