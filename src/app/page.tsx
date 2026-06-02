import { listPublished } from '@/lib/articles-source';
import { ArticleCard } from '@/components/ArticleCard';
import AdSlot from '@/components/AdSlot';
import TrendingTicker from '@/components/TrendingTicker';
import NewsletterSection from '@/components/NewsletterSection';
import DannyWilliamsBroadcast from '@/components/DannyWilliamsBroadcast';
import { CATEGORIES } from '@/lib/categories';
import { relativeTime, readingTime } from '@/lib/readingTime';
import Link from 'next/link';

// 5-min revalidate (was 60s) reduces DB read pressure on the free Turso plan
// while still keeping the homepage fresh for visitors.
export const revalidate = 300;

export default async function HomePage() {
  // listPublished falls back to the snapshot when Turso is read-blocked.
  const articles = await listPublished({ take: 30 });

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
        {/* H1 — single descriptive heading.  AdSense + Google's reviewers
            expect a visually-present H1 on ALL viewports (mobile-first
            ranking signals it's the page's primary topic). Small typography
            so it doesn't compete with hero article headlines below. */}
        <h1 className="text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase text-muted mb-3">
          Byte-Pulse — Independent Tech News: AI, Hardware &amp; Gaming
        </h1>

        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-muted mb-5">
            <span className="relative inline-flex w-2 h-2 rounded-full bg-green-400 live-dot" />
            <span>Last update {relativeTime(lastUpdated)} · Updated every 30 min</span>
          </div>
        )}

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
