import { prisma } from '@/lib/db';
import { ArticleCard } from '@/components/ArticleCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  const results = query.length >= 2
    ? await prisma.article.findMany({
        where: {
          status: 'published',
          OR: [
            { title:    { contains: query } },
            { subtitle: { contains: query } },
            { excerpt:  { contains: query } },
            { content:  { contains: query } },
            { tags:     { contains: query } },
          ],
        },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      })
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display font-extrabold text-3xl mb-4">Search</h1>
      <form className="flex gap-2 mb-8" action="/search">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="What are you looking for? e.g. iPhone, Sora, RTX 5090…"
          className="flex-1 px-4 py-3 rounded-lg bg-bg-elevated border border-white/10 focus:border-accent outline-none"
          autoFocus
        />
        <button className="px-5 py-3 rounded-lg bg-accent hover:bg-accent-hover font-semibold">Search</button>
      </form>

      {query.length < 2 ? (
        <p className="text-muted">Tip: try product names, people, companies, or tags.</p>
      ) : !results.length ? (
        <p className="text-muted">Nothing for "{query}" yet. Maybe tomorrow.</p>
      ) : (
        <>
          <p className="text-muted mb-4">{results.length} result{results.length === 1 ? '' : 's'} for "{query}"</p>
          <div className="grid md:grid-cols-2 gap-4">
            {results.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </>
      )}
    </div>
  );
}
