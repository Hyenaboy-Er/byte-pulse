// Per-tag archive page — every tag on the site gets a stable URL we can
// link to from inside articles. Massive internal-link target for SEO.

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';

type Params = { tag: string };

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return {
    title: `#${decoded} — Byte-Pulse`,
    description: `All Byte-Pulse coverage tagged #${decoded} — latest articles, deep-dives, news roundups.`,
    alternates: { canonical: `/tag/${tag}` },
  };
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag).toLowerCase();

  // Tags are stored as JSON arrays inside the Article.tags column. Pull
  // recent articles and filter in memory — SQLite + libSQL doesn't have
  // efficient JSON-array containment querying, but this scales fine to
  // thousands of articles.
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 200,
  });
  const matched = articles.filter((a) => {
    try {
      const tags = JSON.parse(a.tags) as string[];
      return tags.some((t) => t.toLowerCase() === decoded);
    } catch { return false; }
  });
  if (!matched.length) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link href="/tags" className="text-sm text-muted hover:text-accent">← All tags</Link>

      <h1 className="mt-4 text-4xl font-display font-extrabold tracking-tight">
        #{decoded}
      </h1>
      <p className="text-white/70 mt-2 mb-8">
        {matched.length} article{matched.length === 1 ? '' : 's'} tagged with this topic.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {matched.map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
    </div>
  );
}
