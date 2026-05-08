import { prisma } from '@/lib/db';
import { ArticleCard } from '@/components/ArticleCard';
import AdSlot from '@/components/AdSlot';
import { CATEGORIES } from '@/lib/categories';
import { relativeTime } from '@/lib/readingTime';
import Link from 'next/link';

export const revalidate = 60;

export default async function HomePage() {
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 25,
  });

  const hero = articles[0];
  const secondary = articles.slice(1, 5);
  const grid = articles.slice(5, 17);
  const trending = articles.slice(0, 6);
  const lastUpdated = hero?.publishedAt ?? null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {!articles.length ? (
        <EmptyState />
      ) : (
        <>
          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs text-muted mb-4">
              <span className="relative inline-flex w-2 h-2 rounded-full bg-green-400 live-dot" />
              <span>Last update {relativeTime(lastUpdated)} · Updated every 15 min</span>
            </div>
          )}
          <section className="mb-10">
            {hero && <ArticleCard article={hero} variant="hero" />}
          </section>

          {!!secondary.length && (
            <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {secondary.map((a) => <ArticleCard key={a.id} article={a} />)}
            </section>
          )}

          <AdSlot slot="home-mid" />

          <div className="grid lg:grid-cols-[1fr_280px] gap-10">
            <section>
              <SectionHead title="Latest" />
              <div className="grid md:grid-cols-2 gap-4">
                {grid.map((a) => <ArticleCard key={a.id} article={a} />)}
              </div>
            </section>

            <aside className="space-y-8">
              <div className="rounded-xl bg-bg-card border border-white/5 p-5">
                <div className="text-xs uppercase tracking-wider text-accent font-bold mb-3">Trending</div>
                {trending.map((a) => (
                  <ArticleCard key={a.id} article={a} variant="compact" />
                ))}
              </div>

              <div className="rounded-xl bg-bg-card border border-white/5 p-5">
                <div className="text-xs uppercase tracking-wider text-white/60 font-bold mb-3">Sections</div>
                <ul className="space-y-1.5 text-sm">
                  {CATEGORIES.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/category/${c.slug}`} className="flex items-center gap-2 hover:text-accent">
                        <span>{c.emoji}</span>
                        <span>{c.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-display font-extrabold text-2xl tracking-tight">{title}</h2>
      <span className="h-px flex-1 bg-white/5 mx-4" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <div className="text-6xl mb-4">🤖</div>
      <h1 className="font-display font-extrabold text-3xl mb-3">The bots are warming up…</h1>
      <p className="text-white/70 max-w-xl mx-auto">
        No articles yet. As soon as the Writer agent finishes its first run, the first story will appear here.
      </p>
      <pre className="mt-6 inline-block text-left bg-bg-card border border-white/10 rounded-lg p-4 text-sm text-white/80">
{`# Set your key in .env:
OPENAI_API_KEY=sk-proj-...

# One-shot test:
npm run agent:run

# Or continuous (every 30 min):
npm run agent:loop`}
      </pre>
    </div>
  );
}
