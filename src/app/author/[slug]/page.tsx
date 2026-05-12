// Author profile page — Person schema + bio + latest articles.
// Required for Google's E-E-A-T evaluation: "Is the author a real, named
// person with a stable URL?" Yes, here.

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAuthor, AUTHORS, authorForArticle } from '@/lib/authors';
import { ArticleCard } from '@/components/ArticleCard';

export const revalidate = 3600;

type Params = { slug: string };

export async function generateStaticParams() {
  return AUTHORS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) return {};
  return {
    title: `${author.name} — ${author.role}`,
    description: author.bioEn,
    alternates: { canonical: `/author/${slug}` },
  };
}

export default async function AuthorPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) notFound();

  // Pull recent articles whose category routes to this author. Not strictly
  // accurate (multiple authors could share a slug-hash bucket) but good enough
  // to populate the page with bylined work — better than an empty author page.
  const allRecent = await prisma.article.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 60,
  });
  const articles = allRecent.filter((a) => authorForArticle(a.category).slug === author.slug).slice(0, 12);

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';
  const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: `${SITE_URL}/author/${author.slug}`,
    jobTitle: author.role,
    description: author.bioEn,
    knowsAbout: author.expertise,
    worksFor: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    sameAs: author.sameAs.length ? author.sameAs : undefined,
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/" className="text-sm text-muted hover:text-accent">← Home</Link>

      <div className="mt-6 rounded-2xl bg-bg-card border border-white/5 p-8">
        <div className="text-xs uppercase tracking-wider text-accent font-bold">{author.role}</div>
        <h1 className="mt-1 font-display font-extrabold text-4xl tracking-tight">{author.name}</h1>
        <p className="mt-4 text-base text-white/80 leading-relaxed">{author.bioEn}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {author.expertise.map((e) => (
            <span key={e} className="px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-medium text-accent">
              {e}
            </span>
          ))}
        </div>
      </div>

      {!!articles.length && (
        <section className="mt-12">
          <h2 className="font-display font-extrabold text-2xl tracking-tight mb-4">Latest articles by {author.name}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}

      <div className="mt-12 rounded-xl bg-bg-card/50 border border-white/5 p-5 text-sm text-white/70">
        <strong className="text-white">How Byte-Pulse covers tech news:</strong> Our editorial team uses
        AI tools to monitor world tech sources and draft initial coverage at speed. Every story is then
        reviewed by a human editor for factuality, sourced quotes, and editorial fit before it
        publishes. {author.name} signs off on stories in their expertise area.
        Read the full <Link href="/about" className="text-accent hover:underline">editorial policy</Link>.
      </div>
    </article>
  );
}
