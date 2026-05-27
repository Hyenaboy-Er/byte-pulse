import { listPublished } from '@/lib/articles-source';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { getCategory, CATEGORIES } from '@/lib/categories';
import type { Metadata } from 'next';

export const revalidate = 600;

type Params = { slug: string };

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) return {};
  return {
    title: `${cat.name} – Tech-News`,
    description: cat.description,
  };
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) notFound();

  const articles = await listPublished({ category: cat.slug, take: 50 });

  const [hero, ...rest] = articles;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-10">
        <div className="text-5xl mb-2">{cat.emoji}</div>
        <h1 className="font-display font-extrabold text-4xl tracking-tight" style={{ color: cat.color }}>
          {cat.name}
        </h1>
        <p className="text-white/70 mt-2 max-w-2xl">{cat.description}</p>
      </div>

      {!articles.length ? (
        <p className="text-muted">No articles in this section yet. The bots are on it.</p>
      ) : (
        <>
          {hero && <div className="mb-8"><ArticleCard article={hero} variant="hero" /></div>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </>
      )}
    </div>
  );
}
