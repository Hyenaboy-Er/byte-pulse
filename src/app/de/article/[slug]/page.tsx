import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import ArticleBody from '@/components/ArticleBody';
import { ArticleCard } from '@/components/ArticleCard';
import AdSlot from '@/components/AdSlot';
import AffiliateCTA from '@/components/AffiliateCTA';
import AdsterraNative from '@/components/AdsterraNative';
import ReadingProgress from '@/components/ReadingProgress';
import ShareBar from '@/components/ShareBar';
import ContinueReading from '@/components/ContinueReading';
import SaveButton from '@/components/SaveButton';
import { getCategory } from '@/lib/categories';
import { formatDate, readingTime, formatViews } from '@/lib/readingTime';
import { translateArticle } from '@/lib/agents/translator';
import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 300;
export const dynamic = 'force-dynamic'; // first translation must run server-side

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await prisma.article.findUnique({ where: { slug } });
  if (!a) return {};
  // Try cached translation for meta — fallback to English
  const tr = await prisma.translation.findUnique({ where: { articleId_lang: { articleId: a.id, lang: 'de' } } });
  const title = tr?.title ?? a.title;
  const description = tr?.excerpt ?? a.excerpt;
  const path = `/de/article/${a.slug}`;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';
  const ogImage = a.imageUrl
    ? `${SITE_URL}/api/og-proxy?url=${encodeURIComponent(a.imageUrl)}`
    : `${SITE_URL}/api/og/${a.slug}`;
  // If German translation hasn't completed yet, this page is serving English fallback content.
  // Google flags that as "Duplikat – vom Nutzer nicht als kanonisch festgelegt" because the
  // /de URL has identical text to the /en URL. NOINDEX until the German version exists.
  const hasGerman = !!tr;
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { 'en-US': `/article/${a.slug}`, 'de-DE': path },
    },
    robots: hasGerman
      ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } }
      : { index: false, follow: true, googleBot: { index: false, follow: true } },
    openGraph: {
      type: 'article',
      siteName: 'Byte-Pulse',
      title,
      description,
      url: path,
      publishedTime: a.publishedAt?.toISOString(),
      modifiedTime: a.updatedAt.toISOString(),
      images: [{ url: ogImage }],
      locale: 'de_DE',
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

export default async function ArticlePageDE({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article || article.status !== 'published') notFound();

  // On-demand translate (cached after first hit)
  let de;
  try {
    de = await translateArticle(article.id, 'de');
  } catch (err) {
    console.warn('[de/article] translation failed:', (err as Error).message);
  }

  const title = de?.title ?? article.title;
  const subtitle = de?.subtitle ?? article.subtitle;
  const content = de?.content ?? article.content;
  const tags = de?.tags ?? safeTags(article.tags);

  prisma.article.update({ where: { id: article.id }, data: { views: { increment: 1 } } }).catch(() => null);

  const cat = getCategory(article.category);

  const related = await prisma.article.findMany({
    where: { category: article.category, id: { not: article.id }, status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 4,
  });

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: de?.excerpt ?? article.excerpt,
    inLanguage: 'de-DE',
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/de/article/${article.slug}`,
    articleSection: cat?.name,
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReadingProgress />
      <ShareBar title={title} />
      <Link href="/de" className="text-sm text-muted hover:text-accent">← Startseite</Link>

      {cat && (
        <div className="mt-6">
          <Link
            href={`/de/category/${cat.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10"
            style={{ color: cat.color }}
          >
            {cat.emoji} {cat.name}
          </Link>
        </div>
      )}

      <h1 className="mt-4 font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-[1.05]">
        {title}
      </h1>
      {subtitle && <p className="mt-4 text-xl text-white/75 leading-snug">{subtitle}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
        {article.publishedAt && <span>{formatDate(article.publishedAt)}</span>}
        <span>·</span>
        <span>{readingTime(content)} Min. Lesezeit</span>
        {article.views && article.views >= 50 && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-orange-400">
              <span>🔥</span>{formatViews(article.views)} Aufrufe
            </span>
          </>
        )}
        {!de && <><span>·</span><span className="text-yellow-400">⚠ Englisches Original (Übersetzung folgt)</span></>}
      </div>

      <div className="mt-4">
        <SaveButton slug={article.slug} title={title} />
      </div>

      {article.imageUrl && (
        <div className="my-8 rounded-xl overflow-hidden bg-bg-card border border-white/5">
          <img
            src={`/api/og-proxy?url=${encodeURIComponent(article.imageUrl)}`}
            alt={title}
            width={1200}
            height={675}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="w-full h-auto object-cover"
          />
          {article.imageCredit && <div className="px-4 py-2 text-xs text-muted">{article.imageCredit}</div>}
        </div>
      )}
      {!article.imageUrl && <div className="my-8 h-px bg-white/5" />}

      <ArticleBody content={content} category={article.category} lang="de" />

      <AdsterraNative />

      <AffiliateCTA category={article.category} lang="de" />

      <AdSlot slot="article-bottom" />

      <div className="mt-10 rounded-xl bg-bg-card border border-white/5 p-5">
        <div className="text-xs uppercase tracking-wider text-muted mb-2">Quelle</div>
        <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover break-all">
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
          <h2 className="font-display font-extrabold text-2xl tracking-tight mb-4">Mehr aus {cat?.name}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((a) => <ArticleCard key={a.id} article={a} hrefPrefix="/de" />)}
          </div>
        </section>
      )}

      <ContinueReading excludeId={article.id} excludeCategory={article.category} hrefPrefix="/de" />
    </article>
  );
}

function safeTags(s: string): string[] {
  try { return JSON.parse(s); } catch { return []; }
}
