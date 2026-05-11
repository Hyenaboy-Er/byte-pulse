// Category pill rail above the homepage hero. Each pill is a server-rendered
// link to the category page — no JS state, fully crawlable, SEO-friendly.
// Highlights a colored dot per category so visitors learn the color-coding.

import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

export default function CategoryChips({ hrefPrefix = '' }: { hrefPrefix?: string }) {
  return (
    <nav aria-label="Categories" className="overflow-x-auto scrollbar-thin -mx-4 px-4">
      <ul className="flex items-center gap-2 whitespace-nowrap">
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link
              href={`${hrefPrefix}/category/${c.slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/85 hover:text-white transition border border-transparent hover:border-white/10"
            >
              <span style={{ color: c.color }}>{c.emoji}</span>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
