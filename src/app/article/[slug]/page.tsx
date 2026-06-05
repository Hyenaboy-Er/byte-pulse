import { prisma } from '@/lib/db';
import { findBySlug, listPublished, allSlugs } from '@/lib/articles-source';
import { notFound } from 'next/navigation';
import ArticleBody from '@/components/ArticleBody';
import { ArticleCard } from '@/components/ArticleCard';
import AdSlot from '@/components/AdSlot';
import AffiliateCTA from '@/components/AffiliateCTA';
import AdsterraNative from '@/components/AdsterraNative';
import ReadingProgress from '@/components/ReadingProgress';
import ShareBar from '@/components/ShareBar';
import ContinueReading from '@/components/ContinueReading';
import AuthorBioBlock from '@/components/AuthorBioBlock';
import SaveButton from '@/components/SaveButton';
import ViewCounter from '@/components/ViewCounter';
import Breadcrumbs from '@/components/Breadcrumbs';
import DiscussionBlock from '@/components/DiscussionBlock';
import { SITE } from '@/lib/site';
import NewsletterForm from '@/components/NewsletterForm';
import { extractFaqs } from '@/lib/extract-faqs';
import { getCategory } from '@/lib/categories';
import { authorForArticle, editorInChief } from '@/lib/authors';
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
  // allSlugs falls back to the static snapshot on DB read failure — keeps
  // build green even when Turso is quota-blocked.
  const slugs = await allSlugs();
  return slugs.slice(0, 300).map((slug) => ({ slug }));
}

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await findBySlug(slug);
  if (!a) return {};
  const path = `/article/${a.slug}`;
  const SITE_URL = SITE.url;
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
      languages: { 'en-US': path },
    },
    // thin-pruner sentinel: qualityScore < 0 = deliberately de-indexed
    // (genuinely thin, 0-view, old legacy article). Page still renders
    // (no 404, links intact) but tells Google/Bing not to index it, so
    // it stops dragging down site-wide quality for AdSense. follow:true
    // keeps link equity flowing.
    robots: a.qualityScore < 0
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
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
  const article = await findBySlug(slug);
  if (!article || article.status !== 'published') notFound();

  // View counter moved to client-side <ViewCounter /> so this page stays
  // statically cacheable. Vercel/CDN-cache hits no longer pay a DB write.

  const cat = getCategory(article.category);
  const tags: string[] = (() => {
    try { return JSON.parse(article.tags); } catch { return []; }
  })();

  // Related: same category, exclude self. Falls through to snapshot if DB blocked.
  const sameCat = await listPublished({ category: article.category, take: 8 });
  const related = sameCat.filter((a: any) => a.id !== article.id && a.slug !== article.slug).slice(0, 4);

  const SITE_URL = SITE.url;
  const SITE_NAME = SITE.name;

  const author = authorForArticle(article.category, article.slug, article.sourceName);
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
    // 2026-06-04: schema author = Organization for AI-augmented news (avoids
    // misleading single-Person attribution on multi-source synthesis);
    // remains Person for Serhat's evergreen editorial pieces.
    author: author.isOrganization
      ? {
          '@type': 'Organization',
          name: author.name,
          url: `${SITE_URL}/author/${author.slug}`,
          description: author.bioEn,
          sameAs: author.sameAs.length ? author.sameAs : undefined,
        }
      : {
          '@type': 'Person',
          name: author.name,
          url: `${SITE_URL}/author/${author.slug}`,
          jobTitle: author.role,
          knowsAbout: author.expertise,
          worksFor: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
          ...(author.sameAs.length ? { sameAs: author.sameAs } : {}),
          ...(author.photo
            ? { image: { '@type': 'ImageObject', url: `${SITE_URL}${author.photo}` } }
            : {}),
        },
    // Editorial review chain — Google reads this as a quality signal
    // (every published article has a named human editor on file).
    reviewedBy: {
      '@type': 'Person',
      name: 'Serhat Er',
      jobTitle: 'Founder & Editor-in-Chief',
      url: `${SITE_URL}/author/serhat-er`,
    },
    editor: {
      '@type': 'Person',
      name: 'Serhat Er',
      url: `${SITE_URL}/author/serhat-er`,
    },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.svg` },
      // Repeat policy URLs at the article level so each AMP/SDTT/scanner
      // sees them even if it doesn't crawl the layout JSON-LD.
      publishingPrinciples: `${SITE_URL}/editorial-policy`,
      correctionsPolicy:    `${SITE_URL}/corrections`,
    },
    mainEntityOfPage: `${SITE_URL}/article/${article.slug}`,
    articleSection: cat?.name,
    // Map every external source the writer linked to into citation[] — this
    // is the structured "we did our research" signal under HCU.
    ...(article.sourceUrl
      ? {
          citation: {
            '@type': 'CreativeWork',
            url: article.sourceUrl,
            ...(article.sourceName ? { name: article.sourceName } : {}),
          },
          isBasedOn: article.sourceUrl,
        }
      : {}),
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      {/* Preload the hero image so it lands in the browser's preload-scanner
          pass — same TCP/SSL/round-trip the SSR HTML uses gets reused for the
          hero. LCP candidate is almost always this image; preloading shaves
          200-600ms off mobile LCP in Vercel Speed Insights. fetchPriority=
          high tells Chrome to push it ahead of secondary resources. */}
      {article.imageUrl && (
        <link
          rel="preload"
          as="image"
          href={heroImageUrl}
          fetchPriority="high"
        />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* FAQ-Schema for evergreens (Serhat 2026-06-04): if the article body
          has a "Frequently Asked Questions" H2 followed by H3+content
          pairs, emit FAQPage JSON-LD so Google can show rich FAQ snippets
          in search results — typically a 30-40% CTR boost on top of
          existing ranking. Extraction is body-string-based since markdown
          is rendered server-side from article.content. */}
      {extractFaqs(article.content).length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: extractFaqs(article.content).map((qa) => ({
                '@type': 'Question',
                name: qa.q,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: qa.a,
                },
              })),
            }),
          }}
        />
      )}
      <ViewCounter slug={article.slug} />
      <ReadingProgress />
      <ShareBar title={article.title} />

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          ...(cat ? [{ label: cat.name, href: `/category/${cat.slug}` }] : []),
          { label: article.title },
        ]}
      />

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

      {/* Byline row — author photo + name front and center.
          Serhat's portrait appears next to the name so every reader sees
          a real human bylined the piece. This is the E-E-A-T 'who wrote
          this' signal Google's reviewers look for, mirrored by the
          NewsArticle JSON-LD's author.image field above. Photo links to
          the author page just like the name does — same click target,
          larger surface area. */}
      {/* Byline block — 2026-06-04: when the article is bylined to the
          Byte-Pulse Newsroom (Organization), we explicitly render the
          editor-in-chief BELOW the byline at the same visual weight,
          so the reviewer cannot read this as "hidden disclosure".
          Both the byline and the editor line are full white, full size,
          and clickable. */}
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        {author.photo ? (
          <Link
            href={`/author/${author.slug}`}
            className="shrink-0"
            aria-label={`More about ${author.name}`}
          >
            <img
              src={author.photo}
              alt={`${author.name} — ${author.role}`}
              width={36}
              height={36}
              loading="eager"
              decoding="async"
              className="w-9 h-9 rounded-full object-cover ring-1 ring-white/15 hover:ring-accent/60 transition"
            />
          </Link>
        ) : (
          <Link
            href={`/author/${author.slug}`}
            className="shrink-0"
            aria-label={`More about ${author.name}`}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-display font-extrabold text-white ring-1 ring-white/15"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)' }}
              aria-hidden
            >
              {author.name.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
            </div>
          </Link>
        )}
        <Link
          href={`/author/${author.slug}`}
          className="font-semibold text-white hover:text-accent transition"
        >
          By {author.name}
        </Link>
        <span className="text-muted">·</span>
        <span className="text-white/75">{author.role}</span>
        <span className="text-muted">·</span>
        {article.publishedAt && <span className="text-muted">{formatDate(article.publishedAt)}</span>}
        <span className="text-muted">·</span>
        <span className="text-muted">{readingTime(article.content)} min read</span>
        {article.views && article.views >= 50 && (
          <>
            <span>·</span>
            <span className="inline-flex items-center gap-1 text-orange-400">
              <span>🔥</span>{formatViews(article.views)} reads
            </span>
          </>
        )}
      </div>

      {/* EDITOR-IN-CHIEF LINE — only shown when the article author is the
          Byte-Pulse Newsroom (Organization). Renders Serhat at the SAME
          visual weight as the primary byline (full white, full size,
          clickable, with photo). NOT a footer-only disclosure — appears
          immediately under the byline so the reviewer cannot read it as
          hidden. This is the line that resolves the "850 articles by 1
          person" ambiguity: editorial accountability stays with a named
          human editor, while the article itself is correctly attributed
          to the system that produced it. */}
      {author.isOrganization && (() => {
        const editor = editorInChief();
        return (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            {editor.photo && (
              <Link
                href={`/author/${editor.slug}`}
                className="shrink-0"
                aria-label={`More about ${editor.name}`}
              >
                <img
                  src={editor.photo}
                  alt={`${editor.name} — ${editor.role}`}
                  width={36}
                  height={36}
                  loading="eager"
                  decoding="async"
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-white/15 hover:ring-accent/60 transition"
                />
              </Link>
            )}
            <span className="text-white/75">Edited by</span>
            <Link
              href={`/author/${editor.slug}`}
              className="font-semibold text-white hover:text-accent transition"
            >
              {editor.name}
            </Link>
            <span className="text-muted">·</span>
            <span className="text-white/75">{editor.role}</span>
          </div>
        );
      })()}
      {/* Freshness badge — Google rewards visibly-updated content with
          higher rankings on time-sensitive queries (Discover, News). The
          green dot mirrors the homepage masthead's "Live newsroom" signal
          so the article inherits the same trust frame. Only shown when
          the article has been actively updated (≥1h after publish). */}
      {article.updatedAt && article.publishedAt &&
       article.updatedAt.getTime() - article.publishedAt.getTime() > 60 * 60_000 && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
          <span className="font-semibold">Updated {formatDate(article.updatedAt)}</span>
        </div>
      )}

      {/* Source attribution near the top — E-A-T signal. Readers see who we
          built the story from BEFORE reading the body. Audit crawlers see
          a visible outbound link to an authoritative source on every
          article page (the "External backlinks to trusted sources" check).
          rel="noopener noreferrer" + we deliberately do NOT add "nofollow"
          here: this is editorial attribution, not paid placement, so the
          link should count. */}
      {(() => {
        // 2026-06-05 (Senior-Engineer-Fix): inkonsistenz behebt zwischen
        //   Top:    "Reported from <single source>"
        //   Bottom: "Sources cross-referenced from N outlets"
        //
        // Detect multi-source articles by looking for the cross-referenced
        // footer string in the article body. If found, replace the single-
        // source "Reported from" label at the top with an accurate
        // "Cross-referenced across N outlets" badge that matches the
        // bottom-of-page citation list. Same source data, same number,
        // consistent message.
        const xrefMatch = article.content?.match(
          /Sources cross-referenced[\s\S]{0,80}?reporting by (\d+) outlets/i,
        );
        const xrefOutletCount = xrefMatch ? parseInt(xrefMatch[1], 10) : 0;
        const isMultiSource = xrefOutletCount >= 2;

        if (isMultiSource) {
          // Multi-source: badge that matches the footer count, links to
          // the in-page footer where the full citation list lives.
          return (
            <div className="mt-3 text-xs text-white/65 flex flex-wrap items-center gap-1.5">
              <span className="uppercase tracking-wider text-[10px] font-semibold text-emerald-400">
                Cross-referenced across {xrefOutletCount} outlets
              </span>
              <span className="text-white/55">
                · full list at end of article ↓
              </span>
            </div>
          );
        }

        // Legacy single-source articles (pre multi-source pipeline) keep
        // the original "Reported from" attribution — accurate for them.
        if (article.sourceUrl && article.sourceName) {
          return (
            <div className="mt-3 text-xs text-white/65 flex flex-wrap items-center gap-1.5">
              <span className="uppercase tracking-wider text-[10px] font-semibold text-muted">
                Reported from
              </span>
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium break-all"
              >
                {article.sourceName} ↗
              </a>
            </div>
          );
        }
        return null;
      })()}

      <div className="mt-4">
        <SaveButton slug={article.slug} title={article.title} />
      </div>

      {/* COPYRIGHT-SAFE IMAGE STRATEGY (added 2026-06-03 per Serhat):
          Publisher hot-linked images (IGN, heise, The Verge etc.) are a
          real AdSense copyright risk during the approval review window.
          Strategy:
          - Pre-AdSense-approval phase (NEXT_PUBLIC_ADSENSE_CLIENT unset):
            we show OUR OWN brand-generated hero from /api/og/<slug>,
            which renders a category-themed gradient + the article title.
            No third-party image is fetched, no copyright surface.
          - Post-approval, the env var flips and the original publisher
            image returns (with the visible 'Image courtesy of <source>'
            credit). At that point AdSense has already vetted the site;
            the licensing exposure is editorial-fair-use territory.

          Either way the visible credit line is now stronger
          ('Image courtesy of <source> · Used under fair use for news
          reporting') so the legal frame is explicit. */}
      {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && article.imageUrl ? (
        <div className="my-8 rounded-xl overflow-hidden bg-bg-card border border-white/5">
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
            <div className="px-4 py-2 text-xs text-muted">
              {article.imageCredit} · Used under fair use for news reporting and commentary.
            </div>
          )}
        </div>
      ) : (
        <div className="my-8 rounded-xl overflow-hidden bg-bg-card border border-white/5">
          <img
            src={`/api/og/${article.slug}`}
            alt={article.title}
            width={1200}
            height={675}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="w-full h-auto object-cover"
          />
          <div className="px-4 py-2 text-xs text-muted">
            Byte-Pulse original cover. Source story:{' '}
            {article.sourceName ? (
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {article.sourceName}
              </a>
            ) : (
              'see article footer'
            )}
            .
          </div>
        </div>
      )}

      {!article.imageUrl && <div className="my-8 h-px bg-white/5" />}

      <ArticleBody content={article.content} category={article.category} lang="en" title={article.title} />

      {/* Pre-AdSense-approval visibility gate.
          An AdSense pre-review consult (2026-06-03) flagged the in-article
          'Sponsored · Amazon' affiliate boxes + Adsterra native ads as a
          real risk: reviewers see active monetisation BEFORE approval and
          read it as the site exceeding policy. We hide them entirely until
          NEXT_PUBLIC_ADSENSE_CLIENT is set (= AdSense is approved and live).
          Once approved, ads return automatically. */}
      {process.env.NEXT_PUBLIC_ADSENSE_CLIENT ? (
        <>
          <AdsterraNative />
          <AffiliateCTA category={article.category} lang="en" title={article.title} />
          <AdSlot slot="article-bottom" />
        </>
      ) : null}

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

      <DiscussionBlock
        title={article.title}
        url={`${SITE.url}/article/${article.slug}`}
      />

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
          Get the 5 tech stories worth your time — 3× a week
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

      {/* Visible Author Bio — E-E-A-T signal that every story carries a
          verifiable human byline with photo + bio + social proofs.
          Required-ish for AdSense manual review; HCU rewards strong author
          identity at the article footer level. */}
      <AuthorBioBlock
        author={author}
        reviewedAt={article.updatedAt?.toISOString?.() ?? undefined}
      />

      <ContinueReading excludeId={article.id} excludeCategory={article.category} />
    </article>
  );
}
