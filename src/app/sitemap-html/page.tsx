// Human-readable HTML sitemap, grouped by category.
// Required by AdSense audit (PDF 02.06.2026): "HTML sitemap or clear
// sidebar links". Complements the machine sitemap (/sitemap.xml).
//
// Lists the 200 most recent published articles, grouped by category.
// Used by readers AND by Google as an extra index signal.

import Link from 'next/link';
import { listPublished } from '@/lib/articles-source';
import { CATEGORIES } from '@/lib/categories';

export const metadata = {
  title: 'Sitemap',
  description:
    'Browse Byte-Pulse by topic — every published article, grouped by category. Updated automatically as new stories publish.',
  alternates: { canonical: '/sitemap-html' },
  robots: { index: true, follow: true },
};

// Cache for 1h — the XML sitemap covers freshness for crawlers, this HTML
// version is for readers and for AdSense's structural check.
export const revalidate = 3600;

export default async function HtmlSitemap() {
  const articles = await listPublished({ take: 200 });

  // Group by category
  const grouped = new Map<string, typeof articles>();
  for (const a of articles) {
    const list = grouped.get(a.category) ?? [];
    list.push(a);
    grouped.set(a.category, list);
  }

  // Order categories by count desc (busiest first)
  const ordered = Array.from(grouped.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-display font-extrabold tracking-tight mb-3">Sitemap</h1>
      <p className="text-muted mb-2">
        Browse every recent Byte-Pulse story, grouped by topic. {articles.length} articles
        listed below.
      </p>
      <p className="text-sm text-muted mb-10">
        Looking for the machine-readable version? See{' '}
        <a className="text-accent hover:underline" href="/sitemap.xml">sitemap.xml</a>{' '}
        or our{' '}
        <a className="text-accent hover:underline" href="/news-sitemap.xml">news sitemap</a>.
      </p>

      {/* Top-level navigation */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted mb-4">
          Main pages
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <Link href="/" className="hover:text-accent">Home</Link>
          <Link href="/authors" className="hover:text-accent">Editorial Team</Link>
          <Link href="/tags" className="hover:text-accent">Topics</Link>
          <Link href="/search" className="hover:text-accent">Search</Link>
          <Link href="/about" className="hover:text-accent">About</Link>
          <Link href="/contact" className="hover:text-accent">Contact</Link>
          <Link href="/editorial-policy" className="hover:text-accent">Editorial Policy</Link>
          <Link href="/corrections" className="hover:text-accent">Corrections</Link>
          <Link href="/privacy" className="hover:text-accent">Privacy</Link>
          <Link href="/impressum" className="hover:text-accent">Impressum</Link>
          <Link href="/disclaimer" className="hover:text-accent">Disclaimer</Link>
          <Link href="/affiliate-disclosure" className="hover:text-accent">Affiliate Disclosure</Link>
        </div>
      </section>

      {/* Category sections */}
      {ordered.map(([catSlug, list]) => {
        const catMeta = CATEGORIES.find((c) => c.slug === catSlug);
        const catName = catMeta?.name ?? catSlug;
        return (
          <section key={catSlug} className="mb-12">
            <div className="flex items-baseline gap-3 mb-5 border-b border-white/10 pb-2">
              <h2 className="text-2xl font-display font-extrabold tracking-tight">
                <Link href={`/category/${catSlug}`} className="hover:text-accent">
                  {catName}
                </Link>
              </h2>
              <span className="text-xs text-muted">{list.length} article{list.length === 1 ? '' : 's'}</span>
            </div>
            <ul className="space-y-1.5 text-sm">
              {list.map((a) => (
                <li key={a.id} className="leading-snug">
                  <Link href={`/article/${a.slug}`} className="text-white/85 hover:text-accent">
                    {a.title}
                  </Link>
                  {a.publishedAt && (
                    <span className="text-muted text-xs ml-2">
                      {new Date(a.publishedAt).toISOString().slice(0, 10)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="text-xs text-muted mt-12">
        This sitemap is updated automatically as new stories publish. Refreshes hourly.
      </p>
    </div>
  );
}
