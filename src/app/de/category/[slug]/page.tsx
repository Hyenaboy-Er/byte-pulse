import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { getCategory, CATEGORIES } from '@/lib/categories';
import type { Metadata } from 'next';

export const revalidate = 120;

type Params = { slug: string };

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) return {};
  return {
    title: `${cat.name} – Tech-News auf Deutsch`,
    description: cat.description,
    alternates: { languages: { 'en-US': `/category/${cat.slug}`, 'de-DE': `/de/category/${cat.slug}` } },
  };
}

export default async function CategoryPageDE({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) notFound();

  const articles = await prisma.article.findMany({
    where: { status: 'published', category: cat.slug },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  });

  // Look up DE translations (don't translate on the fly here — would be slow for 50 articles)
  const ids = articles.map((a) => a.id);
  const trs = ids.length
    ? await prisma.translation.findMany({ where: { articleId: { in: ids }, lang: 'de' } })
    : [];
  const trMap = new Map(trs.map((t) => [t.articleId, t]));

  const display = articles.map((a) => {
    const tr = trMap.get(a.id);
    return tr ? { ...a, title: tr.title, subtitle: tr.subtitle, excerpt: tr.excerpt, content: tr.content } : a;
  });

  const [hero, ...rest] = display;

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
        <p className="text-muted">Noch keine Artikel in dieser Rubrik. Die Bots arbeiten dran.</p>
      ) : (
        <>
          {hero && <div className="mb-8"><ArticleCard article={hero as any} variant="hero" hrefPrefix="/de" /></div>}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((a) => <ArticleCard key={a.id} article={a as any} hrefPrefix="/de" />)}
          </div>
        </>
      )}
    </div>
  );
}
