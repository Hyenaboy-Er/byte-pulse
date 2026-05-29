// Corrections policy + log — a strong E-E-A-T signal. Google explicitly
// rewards sites that openly publish how they handle errors. Even an empty
// log with the policy itself is a positive ranking factor under HCU.
import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Corrections & Updates',
  description:
    'How Byte-Pulse handles errors: every correction is logged, dated, and visible. Spot a mistake? editorial@byte-pulse.net.',
  alternates: { canonical: '/corrections' },
  robots: { index: true, follow: true },
};

// Hand-maintained correction log. Append new entries at the top.
// Schema.org Correction microdata is emitted alongside.
type Correction = {
  date: string;          // ISO date the correction was applied
  articleSlug: string;   // the affected article
  articleTitle: string;  // title at time of correction
  summary: string;       // 1-2 sentence description of the change
};

const CORRECTIONS: Correction[] = [
  // No corrections yet. The log is intentionally non-empty in spirit
  // (the policy below applies to every article we've ever published).
];

export default function CorrectionsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Corrections & Updates',
    url: `${SITE.url}/corrections`,
    description:
      'Byte-Pulse corrections log and policy. Errors and updates to published articles.',
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: CORRECTIONS.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Article',
          url: `${SITE.url}/article/${c.articleSlug}`,
          headline: c.articleTitle,
          dateModified: c.date,
        },
      })),
    },
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1 className="font-display font-extrabold text-4xl tracking-tight mb-3">
        Corrections &amp; Updates
      </h1>
      <p className="text-white/70 mb-10 max-w-2xl">
        Every story we publish is fact-checked before it goes live. When we get something
        wrong anyway — a wrong number, a misattributed quote, an outdated claim — we fix
        it openly. This page documents both the policy and the log.
      </p>

      <section className="rounded-xl bg-bg-card border border-white/5 p-6 mb-10">
        <h2 className="font-display font-extrabold text-2xl mb-4">Our policy</h2>
        <ul className="space-y-3 text-white/85 list-disc pl-5">
          <li>
            <strong>Substantive errors get a visible correction note</strong> at the top
            of the article, dated, with a short description of what changed and why.
          </li>
          <li>
            <strong>Typo-level fixes</strong> (spelling, formatting, broken links) are
            corrected silently. We don&apos;t consider these editorial errors.
          </li>
          <li>
            <strong>Outdated claims</strong> are updated with a clearly marked
            &quot;Update (date):&quot; paragraph; the original text remains for context.
          </li>
          <li>
            <strong>Disputed sources</strong> are linked, attributed, and where possible
            cross-referenced with at least one secondary source.
          </li>
          <li>
            <strong>Retractions</strong> — if a story is fundamentally wrong, we keep the
            URL live, replace the body with the retraction notice, and link to the
            current correct coverage. We do not silently delete.
          </li>
        </ul>
      </section>

      <section className="rounded-xl bg-bg-card border border-white/5 p-6 mb-10">
        <h2 className="font-display font-extrabold text-2xl mb-3">Spotted an error?</h2>
        <p className="text-white/80">
          Email the editor:{' '}
          <a className="text-accent hover:underline" href="mailto:editorial@byte-pulse.net">
            editorial@byte-pulse.net
          </a>
          . Include the URL, the specific passage, and what you believe is correct.
          We confirm receipt within 24 hours and publish the correction within 48 hours
          once verified.
        </p>
      </section>

      <section>
        <h2 className="font-display font-extrabold text-2xl mb-4">Correction log</h2>
        {CORRECTIONS.length === 0 ? (
          <p className="text-white/70 italic">
            No corrections to date. As of {new Date().toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
            , no published article has required a substantive correction. New entries
            appear at the top of this list as they happen.
          </p>
        ) : (
          <ol className="space-y-6">
            {CORRECTIONS.map((c) => (
              <li
                key={c.articleSlug + c.date}
                className="border-l-2 border-accent/60 pl-4"
              >
                <div className="text-xs text-muted uppercase tracking-wider mb-1">
                  {c.date}
                </div>
                <Link
                  href={`/article/${c.articleSlug}`}
                  className="block font-semibold text-lg hover:text-accent transition"
                >
                  {c.articleTitle}
                </Link>
                <p className="text-white/80 mt-1">{c.summary}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <hr className="border-white/10 my-12" />

      <p className="text-sm text-muted">
        See also:{' '}
        <Link className="hover:text-accent" href="/editorial-policy">
          Editorial policy
        </Link>{' '}
        ·{' '}
        <Link className="hover:text-accent" href="/about">
          About Byte-Pulse
        </Link>
      </p>
    </article>
  );
}
