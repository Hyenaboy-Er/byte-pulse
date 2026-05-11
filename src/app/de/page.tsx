import { prisma } from '@/lib/db';
import { ArticleCard } from '@/components/ArticleCard';
import AdSlot from '@/components/AdSlot';
import TrendingTicker from '@/components/TrendingTicker';
import { CATEGORIES } from '@/lib/categories';
import { relativeTime, readingTime } from '@/lib/readingTime';
import { t } from '@/lib/i18n';
import Link from 'next/link';

export const revalidate = 60;
export const metadata = {
  title: 'Aktuelle Tech-News, KI, Gaming, Hardware — Byte-Pulse',
  description: 'Byte-Pulse berichtet über KI, Gaming, Hardware, Mobile, Software und Cybersecurity. Bilingual EN/DE, faktengeprüft, alle 15 Minuten neu.',
  alternates: {
    canonical: '/de',
    languages: { 'en-US': '/', 'de-DE': '/de' },
    types: { 'application/rss+xml': '/de/feed.xml' },
  },
  openGraph: {
    type: 'website',
    siteName: 'Byte-Pulse',
    locale: 'de_DE',
    url: '/de',
    title: 'Aktuelle Tech-News, KI, Gaming, Hardware — Byte-Pulse',
    description: 'Byte-Pulse berichtet über KI, Gaming, Hardware, Mobile, Software und Cybersecurity. Bilingual EN/DE, faktengeprüft, alle 15 Minuten neu.',
  },
};

export default async function HomePageDE() {
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 60,
  });

  if (!articles.length) {
    return (
      <div className="text-center py-24 max-w-6xl mx-auto px-4">
        <div className="text-6xl mb-4">🤖</div>
        <h1 className="font-display font-extrabold text-3xl mb-3">Die Bots wachen auf …</h1>
        <p className="text-white/70">Noch keine Artikel da. Sobald der Writer-Agent läuft, erscheint hier was.</p>
      </div>
    );
  }

  // Look up DE translations in bulk for the homepage cards (cheap — single query)
  const ids = articles.map((a) => a.id);
  const trs = await prisma.translation.findMany({ where: { articleId: { in: ids }, lang: 'de' } });
  const trMap = new Map(trs.map((x) => [x.articleId, x]));

  const display = articles.map((a) => {
    const tr = trMap.get(a.id);
    return tr ? { ...a, title: tr.title, subtitle: tr.subtitle, excerpt: tr.excerpt, content: tr.content } : a;
  });

  const lang = t('de');
  const [hero, ...rest] = display;
  const sideStack = rest.slice(0, 4);
  const tickerPool = rest.slice(0, 12);
  const mainGrid = rest.slice(4, 16);
  const trending = rest.slice(0, 6);

  const grouped = new Map<string, typeof display>();
  for (const a of display) {
    const list = grouped.get(a.category) ?? [];
    if (list.length < 4) {
      list.push(a);
      grouped.set(a.category, list);
    }
  }
  const sections = Array.from(grouped.entries())
    .filter(([, list]) => list.length >= 3)
    .slice(0, 4);

  const lastUpdated = articles[0]?.publishedAt;

  return (
    <>
      <TrendingTicker
        hrefPrefix="/de"
        articles={tickerPool.map((a) => ({ slug: a.slug, title: a.title, category: a.category }))}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {lastUpdated && (
          <div className="flex items-center gap-2 text-xs text-muted mb-5">
            <span className="relative inline-flex w-2 h-2 rounded-full bg-green-400 live-dot" />
            <span>Letztes Update {relativeTime(lastUpdated, 'de')} · alle 15 Min aktualisiert</span>
          </div>
        )}

        <section className="grid lg:grid-cols-[1.6fr_1fr] gap-5 mb-12">
          <ArticleCard article={hero as any} variant="hero" hrefPrefix="/de" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 content-start">
            {sideStack.map((a) => {
              const cat = CATEGORIES.find((c) => c.slug === a.category);
              return (
                <Link
                  key={a.id}
                  href={`/de/article/${a.slug}`}
                  className="group block rounded-xl bg-bg-card border border-white/5 hover:border-accent/40 transition overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/10 duration-200"
                >
                  <div className="flex gap-3">
                    {a.imageUrl ? (
                      <img src={a.imageUrl} alt="" loading="lazy" className="w-24 sm:w-28 h-full aspect-square object-cover bg-bg-elevated shrink-0" />
                    ) : (
                      <div className="w-24 sm:w-28 aspect-square gradient-mesh shrink-0" />
                    )}
                    <div className="py-3 pr-3 min-w-0">
                      {cat && (
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>
                          {cat.name}
                        </span>
                      )}
                      <h3 className="mt-0.5 text-sm font-semibold leading-snug group-hover:text-accent transition line-clamp-3">
                        {a.title}
                      </h3>
                      <div className="mt-1.5 text-[11px] text-muted">{readingTime(a.content)} Min.</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <AdSlot slot="home-mid" label="Anzeige" />

        <div className="grid lg:grid-cols-[1fr_300px] gap-10 mt-10">
          <section>
            <SectionHead title={lang.latest} />
            <div className="grid sm:grid-cols-2 gap-4">
              {mainGrid.map((a) => <ArticleCard key={a.id} article={a as any} hrefPrefix="/de" />)}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-xl bg-bg-card border border-white/5 p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs uppercase tracking-wider text-accent font-bold inline-flex items-center gap-2">
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-accent live-dot" />
                  {lang.trending}
                </div>
                <Link href="/de/search" className="text-[11px] text-muted hover:text-accent">Suchen →</Link>
              </div>
              {trending.map((a, i) => (
                <Link
                  key={a.id}
                  href={`/de/article/${a.slug}`}
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
              <div className="text-xs uppercase tracking-wider text-white/60 font-bold mb-3">{lang.sections}</div>
              <ul className="space-y-1.5 text-sm">
                {CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/de/category/${c.slug}`} className="flex items-center gap-2 hover:text-accent transition text-white/85">
                      <span style={{ color: c.color }}>{c.emoji}</span>
                      <span>{c.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

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
                    {cat.name} · Jetzt
                  </h2>
                </div>
                <Link href={`/de/category/${cat.slug}`} className="text-sm text-muted hover:text-accent">
                  Alle ansehen →
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.slice(0, 4).map((a) => <ArticleCard key={a.id} article={a as any} hrefPrefix="/de" />)}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <span className="inline-block w-1 h-7 rounded-full bg-gradient-to-b from-accent to-purple-500" />
        <h2 className="font-display font-extrabold text-2xl tracking-tight">{title}</h2>
      </div>
      <span className="h-px flex-1 bg-white/5 ml-6" />
    </div>
  );
}
