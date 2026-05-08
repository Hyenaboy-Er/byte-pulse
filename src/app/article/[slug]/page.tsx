import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import ArticleBody from '@/components/ArticleBody';
import { ArticleCard } from '@/components/ArticleCard';
import AdSlot from '@/components/AdSlot';
import { getCategory } from '@/lib/categories';
import { formatDate, readingTime } from '@/lib/readingTime';
import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 300;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await prisma.article.findUnique({ where: { slug } });
  if (!a) return {};
  const ogImage = a.imageUrl ?? `/api/og/${a.slug}`;
  return {
    title: a.title,
    description: a.excerpt,
    alternates: { languages: { 'en-US': `/article/${a.slug}`, 'de-DE': `/de/article/${a.slug}` } },
    openGraph: {
      type: 'article',
      title: a.title,
      description: a.excerpt,
      publishedTime: a.publishedAt?.toISOString(),
      images: [{ url: ogImage }],
      locale: 'en_US',
    },
    twitter: { card: 'summary_large_image', title: a.title, description: a.excerpt, images: [ogImage] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article || article.status !== 'published') notFound();

  // best-effort view tracking
  prisma.article.update({ where: { id: article.id }, data: { views: { increment: 1 } } }).catch(() => null);

  const cat = getCategory(article.category);
  const tags: string[] = (() => {
    try { return JSON.parse(article.tags); } catch { return []; }
  })();

  const related = await prisma.article.findMany({
    where: { category: article.category, id: { not: article.id }, status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 4,
  });

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'TechPuls';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/article/${article.slug}`,
    articleSection: cat?.name,
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/" className="text-sm text-muted hover:text-accent">← Home</Link>

      {cat && (
        <div className="mt-6">
          <Link
            href={`/category/${cat.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10"
            style={{ color: cat.color }}
          >
            {cat.emoji} {cat.name}
          </Link>
        </div>
      )}

      <h1 className="mt-4 font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-[1.05]">
        {article.title}
      </h1>
      {article.subtitle && (
        <p className="mt-4 text-xl text-white/75 leading-snug">{article.subtitle}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
        {article.publishedAt && <span>{formatDate(article.publishedAt)}</span>}
        <span>·</span>
        <span>{readingTime(article.content)} min read</span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <span className="text-green-400">●</span> Quality {article.qualityScore}/100
        </span>
      </div>

      {article.imageUrl && (
        <div className="my-8 rounded-xl overflow-hidden bg-bg-card border border-white/5">
          <img src={article.imageUrl} alt={article.title} className="w-full h-auto object-cover" />
          {article.imageCredit && (
            <div className="px-4 py-2 text-xs text-muted">{article.imageCredit}</div>
          )}
        </div>
      )}

      {!article.imageUrl && <div className="my-8 h-px bg-white/5" />}

      <ArticleBody content={article.content} />

      <AdSlot slot="article-bottom" />

      <div className="mt-10 rounded-xl bg-bg-card border border-white/5 p-5">
        <div className="text-xs uppercase tracking-wider text-muted mb-2">Source</div>
        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:text-accent-hover break-all"
        >
          {article.sourceName} – {article.sourceUrl}
        </a>
      </div>

      {!!tags.length && (
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="px-2.5 py-1 rounded-full bg-white/5 text-xs text-white/70">#{t}</span>
          ))}
        </div>
      )}

      {!!related.length && (
        <section className="mt-14">
          <h2 className="font-display font-extrabold text-2xl tracking-tight mb-4">More from {cat?.name}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}
    </article>
  );
}
