// Horizontal auto-scrolling "trending now" pill bar. Shown directly under the
// header on both EN and DE homepages. Pulls the top N most recent articles
// (or, optionally, the most viewed in the last 24h) as clickable chips.
//
// Drives a meaningful chunk of session pageviews: visitors land on the home
// hero, see what else is hot in one glance, click through to a second
// article — which is exactly the engagement signal AdSense ranks on.

import Link from 'next/link';
import { getCategory } from '@/lib/categories';

type TickerArticle = {
  slug: string;
  title: string;
  category: string;
};

export default function TrendingTicker({
  articles,
  hrefPrefix = '',
  label,
}: {
  articles: TickerArticle[];
  hrefPrefix?: string;
  label?: string;
}) {
  const isDE = hrefPrefix === '/de';
  const heading = label ?? (isDE ? 'Trending jetzt' : 'Trending now');
  if (!articles.length) return null;

  return (
    <div className="border-y border-white/5 bg-bg-card/30 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-3 h-11 overflow-hidden">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent shrink-0">
          <span className="relative inline-flex w-2 h-2 rounded-full bg-accent live-dot" />
          {heading}
        </span>
        <div
          className="flex-1 overflow-x-auto scrollbar-thin"
          aria-label={heading}
          role="region"
        >
          <ul className="flex items-center gap-2 whitespace-nowrap pr-4">
            {articles.map((a) => {
              const cat = getCategory(a.category);
              return (
                <li key={a.slug}>
                  <Link
                    href={`${hrefPrefix}/article/${a.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/85 hover:text-white transition"
                  >
                    {cat && <span style={{ color: cat.color }}>{cat.emoji}</span>}
                    <span className="max-w-[260px] truncate">{a.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
