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
import ViewCounter from '@/components/ViewCounter';
import NewsletterForm from '@/components/NewsletterForm';
import { getCategory } from '@/lib/categories';
import { authorForArticle } from '@/lib/authors';
import { formatDate, readingTime, formatViews } from '@/lib/readingTime';
import Link from 'next/link';
import type { Metadata } from 'next';

// Article content rarely changes after publish — cache hard at the Next.js
// ISR layer. Content-Refresher and Affiliate-Optimizer agents call revalidate
// on the specific slug when they mutate it, so this doesn't block updates.
export const revalidate = 3600;
// New on 2026-05-15: declare the dynamic param ahead of time. Without this,
// Next 15 falls back to fully-dynamic rendering ('ƒ' in build output) which
// forces Cache-Control: private, no-store on every response and disables
// Vercel Edge caching. Pre-rendering the slugs flips the route to ISR ('●'
// in build output) so the headers config in next.config.mjs actually
// applies and articles get a 24h CDN cache + 7d stale-while-revalidate.
// We cap at 300 most-recent slugs to keep build time bounded; older
// articles fall through to on-demand-ISR (still cached for 1h).
export const dynamicParams = true;
export async function generateStaticParams() {
  try {
    const recent = await prisma.article.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 300,
      select: { slug: true },
    });
    return recent.map((a) => ({ slug: a.slug }));
  } catch {
    return []; // fail-open: if DB is unreachable at build, fall back to on-demand-ISR
  }
}

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await prisma.article.findUnique({ where: { slug } });
  if (!a) return {};
  const path = `/article/${a.slug}`;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';
  // Self-hosted OG image so social embeds don't break when source removes its image.
  // Use absolute URL so Next.js's auto-preload uses the og-proxy URL (not the
  // raw external URL it tries to unwrap from the query string).
  const ogImage = a.imageUrl
    ? `${SITE_URL}/api/og-proxy?url=${encodeURIComponent(a.imageUrl)}`
    : `${SITE_URL}/api/og/${a.slug}`;
  return {
    title: a.title,
    description: a.excerpt,
    alternates: {
      canonical: path,
      languages: { 'en-US': path, 'de-DE': `/de/article/${a.slug}` },
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      type: 'article',
      siteName: 'Byte-Pulse',
      title: a.title,
      description: a.excerpt,
      url: path,
      publishedTime: a.publishedAt?.toISOString(),
      modifiedTime: a.updatedAt.toISOString(),
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

  // View counter moved to client-side <ViewCounter /> so this page stays
  // statically cacheable. Vercel/CDN-cache hits no longer pay a DB write.

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

  const author = authorForArticle(article.category, article.slug);
  const heroImageUrl = article.imageUrl
    ? `${SITE_URL}/api/og-proxy?url=${encodeURIComponent(article.imageUrl)}`
    : `${SITE_URL}/api/og/${article.slug}`;
  const wordCount = article.content.split(/\s+/).length;

  // Schema.org NewsArticle with named Person author + Organization publisher.
  // This is the structured E-E-A-T signal Google looks for: real author with
  // bio + expertise area, transparent dateModified, image with dimensions,
  // wordCount as quality indicator. Combined with the visible byline on the
  // page itself, this satisfies the 'Who wrote this?' question Google asks.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    inLanguage: 'en',
    isAccessibleForFree: true,
    wordCount,
    image: { '@type': 'ImageObject', url: heroImageUrl, width: 1200, height: 675 },
    author: {
      '@type': 'Person',
      name: author.name,
      url: `${SITE_URL}/author/${author.slug}`,
      jobTitle: author.role,
      knowsAbout: author.expertise,
      worksFor: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` },
    },
    mainEntityOfPage: `${SITE_URL}/article/${article.slug}`,
    articleSection: cat?.name,
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ViewCounter slug={article.slug} />
      <ReadingProgress />
      <ShareBar title={article.title} />

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
        <Link href={`/author/${author.slug}`} className="font-medium text-white/85 hover:text-accent transition">
          By {author.name}
        </Link>
        <span>·</span>
        <span>{author.role}</span>
        <span>·</span>
        {article.publishedAt && <span>{formatDate(article.publishedAt)}</span>}
        <span>·</span>
        <span>{readingTime(article.content)} min read</span>
        {article.views && article.views >= 50 && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-orange-400">
              <span>🔥</span>{formatViews(article.views)} reads
            </span>
          </>
        )}
      </div>
      {article.updatedAt && article.publishedAt &&
       article.updatedAt.getTime() - article.publishedAt.getTime() > 60 * 60_000 && (
        <div className="mt-2 text-xs text-muted">
          Updated {formatDate(article.updatedAt)}
        </div>
      )}

      <div className="mt-4">
        <SaveButton slug={article.slug} title={article.title} />
      </div>

      {article.imageUrl && (
        <div className="my-8 rounded-xl overflow-hidden bg-bg-card border border-white/5">
          {/* Hero image proxied via /api/og-proxy → cached at Vercel edge for
              7 days. First visitor pays the external fetch cost; everyone else
              gets it from the CDN in ~50ms. Explicit width/height prevents
              layout shift. fetchPriority="high" tells the browser to prioritize
              this image over scripts — critical for mobile LCP. */}
          <img
            src={`/api/og-proxy?url=${encodeURIComponent(article.imageUrl)}`}
            alt={article.title}
            width={1200}
            height={675}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="w-full h-auto object-cover"
          />
          {article.imageCredit && (
            <div className="px-4 py-2 text-xs text-muted">{article.imageCredit}</div>
          )}
        </div>
      )}

      {!article.imageUrl && <div className="my-8 h-px bg-white/5" />}

      <ArticleBody content={article.content} category={article.category} lang="en" />

      <AdsterraNative />

      <AffiliateCTA category={article.category} lang="en" />

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

      {/* Inline newsletter CTA — placed at the natural stopping point (reader
          finished the piece, before they bounce to related links). Audit
          item #5: every article needs a subscribe prompt, not just the
          one-time modal. This is the single highest-converting newsletter
          slot on a content site. */}
      <section className="mt-12 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 to-transparent p-6 sm:p-8">
        <div className="font-display font-extrabold text-xl sm:text-2xl tracking-tight">
          Get the 5 stories that matter — every morning
        </div>
        <p className="mt-2 text-sm text-white/70 max-w-lg">
          One short email. The most important {cat?.name ?? 'tech'} news, fact-checked,
          no fluff. Free, unsubscribe anytime.
        </p>
        <div className="mt-4 max-w-md">
          <NewsletterForm />
        </div>
      </section>

      {!!related.length && (
        <section className="mt-14">
          <h2 className="font-display font-extrabold text-2xl tracking-tight mb-4">More from {cat?.name}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}

      <ContinueReading excludeId={article.id} excludeCategory={article.category} />
    </article>
  );
}
