// Custom 404 page.
//
// AdSense + Google's quality reviewers expect 404 handling to feel
// intentional (custom design + useful navigation), not the framework
// default. We also surface the latest few stories so a misdirected
// reader has something to read instead of bouncing — that pushes
// bounce-rate down, which is itself an AdSense readiness signal.

import Link from 'next/link';
import { listPublished } from '@/lib/articles-source';
import { CATEGORIES } from '@/lib/categories';

export const metadata = {
  title: 'Page not found',
  description:
    'The page you were looking for does not exist on Byte-Pulse. Browse our latest tech stories or search the archive.',
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  // Best-effort: pull the latest 4 stories so we never serve an empty
  // 404. If reads fail, fall back to category links only.
  let latest: Awaited<ReturnType<typeof listPublished>> = [];
  try {
    latest = await listPublished({ take: 4 });
  } catch {
    /* snapshot fallback inside listPublished already handled */
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <p className="text-xs uppercase tracking-[0.22em] font-semibold text-muted mb-3">
        Error 404
      </p>
      <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight leading-[1.05]">
        We can&apos;t find that page.
      </h1>
      <p className="mt-4 text-base sm:text-lg text-white/75 leading-snug max-w-xl">
        The link is broken or the page has moved. No big deal. Try one of these
        instead.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition"
        >
          ← Go home
        </Link>
        <Link
          href="/sitemap-html"
          className="px-4 py-2 rounded-lg border border-white/15 hover:border-white/40 text-white/85 font-semibold text-sm transition"
        >
          Browse the sitemap
        </Link>
        <Link
          href="/search"
          className="px-4 py-2 rounded-lg border border-white/15 hover:border-white/40 text-white/85 font-semibold text-sm transition"
        >
          Search the archive
        </Link>
      </div>

      <div className="mt-12">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted mb-4">
          Latest stories
        </h2>
        {latest.length ? (
          <ul className="space-y-2 text-sm">
            {latest.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/article/${a.slug}`}
                  className="text-white/85 hover:text-accent transition"
                >
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            Browse our latest by topic instead.
          </p>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted mb-4">
          By topic
        </h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 text-xs font-semibold transition"
              style={{ color: c.color }}
            >
              {c.emoji} {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
