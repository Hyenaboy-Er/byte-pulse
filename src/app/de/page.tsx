import { prisma } from '@/lib/db';
import { ArticleCard } from '@/components/ArticleCard';
import AdSlot from '@/components/AdSlot';
import { CATEGORIES } from '@/lib/categories';
import { translateArticle } from '@/lib/agents/translator';
import Link from 'next/link';
import { t } from '@/lib/i18n';

export const revalidate = 60;
export const metadata = {
  title: 'Byte-Pulse – Tech, Gaming, KI auf Deutsch',
  description: 'Tech-News, Gaming, KI – das Wichtigste auf Deutsch.',
  alternates: { languages: { 'en-US': '/', 'de-DE': '/de' } },
};

export default async function HomePageDE() {
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 25,
  });

  // For each article, look up its German translation. If missing, show English fallback —
  // we DO NOT translate 25 articles on a homepage view (would be slow + costly).
  // Translations are filled in lazily when users open individual articles.
  const translated = await Promise.all(
    articles.map(async (a) => {
      const tr = await prisma.translation.findUnique({ where: { articleId_lang: { articleId: a.id, lang: 'de' } } });
      return tr
        ? { ...a, title: tr.title, subtitle: tr.subtitle, excerpt: tr.excerpt, content: tr.content }
        : a;
    })
  );

  const lang = t('de');
  const hero = translated[0];
  const secondary = translated.slice(1, 5);
  const grid = translated.slice(5, 17);
  const trending = translated.slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {!translated.length ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="font-display font-extrabold text-3xl mb-3">Die Bots wachen auf …</h1>
          <p className="text-white/70">Noch keine Artikel da. Sobald der Writer-Agent läuft, erscheint hier was.</p>
        </div>
      ) : (
        <>
          <section className="mb-10">
            {hero && <ArticleCard article={hero as any} variant="hero" hrefPrefix="/de" />}
          </section>

          {!!secondary.length && (
            <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {secondary.map((a) => <ArticleCard key={a.id} article={a as any} hrefPrefix="/de" />)}
            </section>
          )}

          <AdSlot slot="home-mid" />

          <div className="grid lg:grid-cols-[1fr_280px] gap-10">
            <section>
              <SectionHead title={lang.latest} />
              <div className="grid md:grid-cols-2 gap-4">
                {grid.map((a) => <ArticleCard key={a.id} article={a as any} hrefPrefix="/de" />)}
              </div>
            </section>

            <aside className="space-y-8">
              <div className="rounded-xl bg-bg-card border border-white/5 p-5">
                <div className="text-xs uppercase tracking-wider text-accent font-bold mb-3">{lang.trending}</div>
                {trending.map((a) => (
                  <ArticleCard key={a.id} article={a as any} variant="compact" hrefPrefix="/de" />
                ))}
              </div>

              <div className="rounded-xl bg-bg-card border border-white/5 p-5">
                <div className="text-xs uppercase tracking-wider text-white/60 font-bold mb-3">{lang.sections}</div>
                <ul className="space-y-1.5 text-sm">
                  {CATEGORIES.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/de/category/${c.slug}`} className="flex items-center gap-2 hover:text-accent">
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
