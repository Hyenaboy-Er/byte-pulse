import { prisma } from '@/lib/db';
import { CATEGORIES } from '@/lib/categories';
import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: 1000,
  });

  const articleUrls = articles.flatMap((a) => [
    {
      url: `${SITE_URL}/article/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
      alternates: { languages: { en: `${SITE_URL}/article/${a.slug}`, de: `${SITE_URL}/de/article/${a.slug}` } },
    },
    {
      url: `${SITE_URL}/de/article/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'hourly' as const,
      priority: 0.7,
      alternates: { languages: { en: `${SITE_URL}/article/${a.slug}`, de: `${SITE_URL}/de/article/${a.slug}` } },
    },
  ]);

  const categoryUrls = CATEGORIES.flatMap((c) => [
    { url: `${SITE_URL}/category/${c.slug}`,    lastModified: new Date(), changeFrequency: 'hourly' as const, priority: 0.6 },
    { url: `${SITE_URL}/de/category/${c.slug}`, lastModified: new Date(), changeFrequency: 'hourly' as const, priority: 0.55 },
  ]);

  return [
    { url: SITE_URL,            lastModified: new Date(), changeFrequency: 'hourly',  priority: 1 },
    { url: `${SITE_URL}/de`,    lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.95 },
    { url: `${SITE_URL}/newsletter`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...categoryUrls,
    ...articleUrls,
  ];
}
