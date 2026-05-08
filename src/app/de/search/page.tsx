import { prisma } from '@/lib/db';
import { ArticleCard } from '@/components/ArticleCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Suche', alternates: { languages: { 'en-US': '/search', 'de-DE': '/de/search' } } };

export default async function SearchPageDE({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  // Search in BOTH original article (English) and translation (German) — so DE users
  // can search in either language and find what's relevant.
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

  // Replace EN content with DE translation if we have it
  const ids = results.map((r) => r.id);
  const trs = ids.length
    ? await prisma.translation.findMany({ where: { articleId: { in: ids }, lang: 'de' } })
    : [];
  const trMap = new Map(trs.map((t) => [t.articleId, t]));
  const display = results.map((a) => {
    const tr = trMap.get(a.id);
    return tr ? { ...a, title: tr.title, subtitle: tr.subtitle, excerpt: tr.excerpt, content: tr.content } : a;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display font-extrabold text-3xl mb-4">Suche</h1>
      <form className="flex gap-2 mb-8" action="/de/search">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Wonach suchst du? z.B. iPhone, Sora, RTX 5090…"
          className="flex-1 px-4 py-3 rounded-lg bg-bg-elevated border border-white/10 focus:border-accent outline-none"
          autoFocus
        />
        <button className="px-5 py-3 rounded-lg bg-accent hover:bg-accent-hover font-semibold">Suchen</button>
      </form>

      {query.length < 2 ? (
        <p className="text-muted">Tipp: nach Produkten, Personen, Firmen oder Tags suchen.</p>
      ) : !display.length ? (
        <p className="text-muted">Nichts gefunden für „{query}". Vielleicht morgen.</p>
      ) : (
        <>
          <p className="text-muted mb-4">{display.length} Treffer für „{query}"</p>
          <div className="grid md:grid-cols-2 gap-4">
            {display.map((a) => <ArticleCard key={a.id} article={a as any} hrefPrefix="/de" />)}
          </div>
        </>
      )}
    </div>
  );
}
