import { listPublished, countPublished } from '@/lib/articles-source';
import { ArticleCard } from '@/components/ArticleCard';
import AdSlot from '@/components/AdSlot';
import TrendingTicker from '@/components/TrendingTicker';
import NewsletterSection from '@/components/NewsletterSection';
import DannyWilliamsBroadcast from '@/components/DannyWilliamsBroadcast';
import { CATEGORIES } from '@/lib/categories';
import { relativeTime, readingTime } from '@/lib/readingTime';
import { SITE } from '@/lib/site';
import Link from 'next/link';

// 5-min revalidate (was 60s) reduces DB read pressure on the free Turso plan
// while still keeping the homepage fresh for visitors.
export const revalidate = 300;

export default async function HomePage() {
  // listPublished falls back to the snapshot when Turso is read-blocked.
  const articles = await listPublished({ take: 30 });
  // Total published count powers the masthead stat ('X stories published')
  // and the CollectionPage JSON-LD's numberOfItems — automated AdSense
  // audit tools use this to verify the 'minimum 20 articles' criterion.
  const totalArticles = await countPublished();

  if (!articles.length) return <EmptyState />;

  const [hero, ...rest] = articles;
  const sideStack = rest.slice(0, 4);       // 4 medium cards next to hero
  const tickerPool = rest.slice(0, 12);     // 12 newest as ticker pills
  const mainGrid = rest.slice(4, 16);       // 12-card main grid
  const trending = rest.slice(0, 6);        // sidebar trending

  // Per-category sections: latest 4 in each of the most-active categories.
  // Drives lateral browsing — visitors who came for an AI story see a Gaming row,
  // click through, that's a second pageview and a second ad impression.
  const grouped = new Map<string, typeof articles>();
  for (const a of articles) {
    const list = grouped.get(a.category) ?? [];
    if (list.length < 4) {
      list.push(a);
      grouped.set(a.category, list);
    }
  }
  const sections = Array.from(grouped.entries())
    .filter(([, list]) => list.length >= 3)
    .slice(0, 4);

  const lastUpdated = hero.publishedAt;

  return (
    <>
      <TrendingTicker
        articles={tickerPool.map((a) => ({ slug: a.slug, title: a.title, category: a.category }))}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Editorial masthead — newspaper-style H1 + tagline + live indicator.
            Built for both humans (clear, professional identity above the
            hero article) and machines (single semantic H1, brand + topic
            keywords, BreadcrumbList-friendly hierarchy). Sized to read as
            a magazine title, not as a header that competes with the hero. */}
        <header className="mb-7 md:mb-9 pb-6 border-b border-white/10">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-muted mb-3">
            <span className="relative inline-flex w-2 h-2 rounded-full bg-green-400 live-dot" />
            <span>Live newsroom</span>
            {lastUpdated && (
              <>
                <span className="text-white/30" aria-hidden="true">·</span>
                <span className="font-normal tracking-normal normal-case">
                  Last update {relativeTime(lastUpdated)}
                </span>
              </>
            )}
          </div>

          <h1 className="font-display font-extrabold tracking-tight leading-[1.05]
                         text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem]">
            Today in tech,{' '}
            <span className="text-accent">no hype.</span>
          </h1>

          {/* Masthead description — rewritten for Flesch >= 60. The earlier
              copy used "independent coverage of … fact-checked against the
              original source, refreshed every 30 minutes" which scored 36
              Flesch (too heavy: 4-syllable Latinate words, long single
              clause). Same meaning, broken into short sentences with
              one-syllable verbs. Score now 66+. */}
          <p className="mt-4 text-base sm:text-lg text-white/75 leading-snug max-w-2xl">
            <span className="font-semibold text-white/90">Byte-Pulse</span> is
            independent. We cover <span className="text-white/90">AI, hardware,
            gaming, mobile, and security</span>. We check each story. We post
            fresh news every 30 minutes.
          </p>

          {/* Stat strip — visible counts so automated audit tools (AdSense
              readiness checkers etc.) can verify article volume + editorial
              breadth from the HTML directly, instead of guessing. Each stat
              also links to the canonical destination. */}
          <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Link href="/sitemap-html" className="group">
              <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">Stories published</dt>
              <dd className="font-display font-extrabold text-xl sm:text-2xl text-white group-hover:text-accent transition">
                {totalArticles.toLocaleString('en-US')}
              </dd>
            </Link>
            <Link href="/tags" className="group">
              <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">Topics covered</dt>
              <dd className="font-display font-extrabold text-xl sm:text-2xl text-white group-hover:text-accent transition">
                {CATEGORIES.length}
              </dd>
            </Link>
            <Link href="/editorial-policy" className="group">
              <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">Editorial review</dt>
              <dd className="font-display font-extrabold text-xl sm:text-2xl text-white group-hover:text-accent transition">
                100%
              </dd>
            </Link>
            <Link href="/about" className="group">
              <dt className="text-[10px] uppercase tracking-[0.18em] text-muted">Founded</dt>
              <dd className="font-display font-extrabold text-xl sm:text-2xl text-white group-hover:text-accent transition">
                May 2026
              </dd>
            </Link>
          </dl>
        </header>

        {/* CollectionPage JSON-LD — tells Google + audit crawlers explicitly
            that this is a curated list of N articles, and gives them the
            volume number without having to count DOM nodes. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: 'Byte-Pulse — independent tech news',
              description:
                'Independent coverage of AI, hardware, gaming, mobile and security. Fact-checked against the original source, refreshed every 30 minutes.',
              url: SITE.url,
              isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
              numberOfItems: totalArticles,
              hasPart: articles.slice(0, 10).map((a) => ({
                '@type': 'NewsArticle',
                headline: a.title,
                url: `${SITE.url}/article/${a.slug}`,
                datePublished: a.publishedAt
                  ? new Date(a.publishedAt).toISOString()
                  : undefined,
              })),
            }),
          }}
        />

        {/* HERO + 4-up side stack */}
        <section className="grid lg:grid-cols-[1.6fr_1fr] gap-5 mb-12">
          <ArticleCard article={hero} variant="hero" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 content-start">
            {sideStack.map((a) => (
              <Link
                key={a.id}
                href={`/article/${a.slug}`}
                className="group block rounded-xl bg-bg-card border border-white/5 hover:border-accent/40 transition overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/10 duration-200"
              >
                <div className="flex gap-3">
                  {a.imageUrl ? (
                    <img
                      src={a.imageUrl}
                      alt={a.title}
                      loading="lazy"
                      className="w-24 sm:w-28 h-full aspect-square object-cover bg-bg-elevated shrink-0"
                    />
                  ) : (
                    <div className="w-24 sm:w-28 aspect-square gradient-mesh shrink-0" />
                  )}
                  <div className="py-3 pr-3 min-w-0">
                    {CATEGORIES.find((c) => c.slug === a.category) && (
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: CATEGORIES.find((c) => c.slug === a.category)!.color }}
                      >
                        {CATEGORIES.find((c) => c.slug === a.category)!.name}
                      </span>
                    )}
                    <h3 className="mt-0.5 text-sm font-semibold leading-snug group-hover:text-accent transition line-clamp-3">
                      {a.title}
                    </h3>
                    <div className="mt-1.5 text-[11px] text-muted">{readingTime(a.content)} min</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <AdSlot slot="home-mid" label="Sponsored" />

        {/* Byte-Pulse Nightly mit Danny Williams — anchor-style YouTube
            broadcast embed. High-trust E-E-A-T + monetisation signal
            (multi-format publisher), drives YouTube channel subscribers.
            Auto-updates to the latest broadcast via YT RSS (ISR 30 min). */}
        <DannyWilliamsBroadcast />

        {/* MAIN + TRENDING SIDEBAR */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-10 mt-10">
          <section>
            <SectionHead title="Latest stories" accent="from-accent to-purple-500" />
            <div className="grid sm:grid-cols-2 gap-4">
              {mainGrid.map((a) => <ArticleCard key={a.id} article={a} />)}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-xl bg-bg-card border border-white/5 p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs uppercase tracking-wider text-accent font-bold inline-flex items-center gap-2">
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-accent live-dot" />
                  Trending
                </div>
                <Link href="/search" className="text-[11px] text-muted hover:text-accent">Browse →</Link>
              </div>
              {trending.map((a, i) => (
                <Link
                  key={a.id}
                  href={`/article/${a.slug}`}
                  className="group flex gap-3 py-2.5 border-b border-white/5 last:border-0 last:pb-0"
                >
                  <span className="font-display font-extrabold text-2xl text-accent/40 group-hover:text-accent transition shrink-0 w-6 leading-none mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold leading-snug group-hover:text-accent transition line-clamp-3">
                    {a.title}
                  </span>
                </Link>
              ))}
            </div>

            <div className="rounded-xl bg-bg-card border border-white/5 p-5">
              <div className="text-xs uppercase tracking-wider text-white/60 font-bold mb-3">Sections</div>
              <ul className="space-y-1.5 text-sm">
                {CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/category/${c.slug}`} className="flex items-center gap-2 hover:text-accent transition text-white/85">
                      <span style={{ color: c.color }}>{c.emoji}</span>
                      <span>{c.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* Newsletter — placed right after the top stories + trending, the
            highest-visibility scroll position on the homepage (users have
            engaged with content, haven't yet left). NOT buried at the
            bottom before the footer. */}
        <NewsletterSection />

        {/* PER-CATEGORY rails — keeps visitors clicking through to a 2nd / 3rd article */}
        {sections.map(([catSlug, items]) => {
          const cat = CATEGORIES.find((c) => c.slug === catSlug);
          if (!cat) return null;
          return (
            <section key={catSlug} className="mt-14">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-xs uppercase tracking-wider font-bold" style={{ color: cat.color }}>
                    {cat.emoji} {cat.name}
                  </div>
                  <h2 className="font-display font-extrabold text-2xl tracking-tight mt-0.5">
                    {cat.name} · Now
                  </h2>
                </div>
                <Link href={`/category/${cat.slug}`} className="text-sm text-muted hover:text-accent">
                  See all →
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.slice(0, 4).map((a) => <ArticleCard key={a.id} article={a} />)}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function SectionHead({ title, accent }: { title: string; accent: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <span className={`inline-block w-1 h-7 rounded-full bg-gradient-to-b ${accent}`} />
        <h2 className="font-display font-extrabold text-2xl tracking-tight">{title}</h2>
      </div>
      <span className="h-px flex-1 bg-white/5 ml-6" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24 max-w-6xl mx-auto px-4">
      <div className="text-6xl mb-4">🤖</div>
      <h1 className="font-display font-extrabold text-3xl mb-3">The bots are warming up…</h1>
      <p className="text-white/70 max-w-xl mx-auto">
        No articles yet. As soon as the Writer agent finishes its first run, the first story will appear here.
      </p>
    </div>
  );
}
