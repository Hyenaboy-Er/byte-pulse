import Link from 'next/link';
import { getCategory } from '@/lib/categories';
import { readingTime, relativeTime } from '@/lib/readingTime';

type Article = {
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt: string;
  content: string;
  category: string;
  imageUrl?: string | null;
  publishedAt: Date | string | null;
  sourceName: string;
  qualityScore: number;
};

type Variant = 'default' | 'hero' | 'compact';

export function ArticleCard({
  article,
  variant = 'default',
  hrefPrefix = '',
}: {
  article: Article;
  variant?: Variant;
  hrefPrefix?: string;
}) {
  const cat = getCategory(article.category);
  const isDE = hrefPrefix === '/de';
  const time = article.publishedAt ? relativeTime(article.publishedAt, isDE ? 'de' : 'en') : '';
  const articleHref = `${hrefPrefix}/article/${article.slug}`;
  const minLabel = isDE ? 'Min.' : 'min';
  const minRead = isDE ? 'Min. Lesezeit' : 'min read';
  const sourceLabel = isDE ? 'Quelle' : 'Source';

  if (variant === 'hero') {
    return (
      <Link
        href={articleHref}
        className="group block rounded-2xl bg-bg-card border border-white/5 hover:border-accent/50 transition relative overflow-hidden"
      >
        {article.imageUrl ? (
          <div className="aspect-[16/8] w-full overflow-hidden bg-bg-elevated">
            <img
              src={article.imageUrl}
              alt=""
              loading="eager"
              className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"
            />
          </div>
        ) : (
          <div className="aspect-[16/8] gradient-mesh" />
        )}
        <div className="p-6 md:p-8 relative">
          {cat && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10"
              style={{ color: cat.color }}
            >
              {cat.emoji} {cat.name}
            </span>
          )}
          <h2 className="mt-4 text-3xl md:text-5xl font-display font-extrabold tracking-tight leading-[1.05] group-hover:text-accent transition">
            {article.title}
          </h2>
          {article.subtitle && (
            <p className="mt-3 text-lg md:text-xl text-white/70 max-w-3xl">{article.subtitle}</p>
          )}
          <div className="mt-5 flex items-center gap-3 text-sm text-muted">
            <span>{time}</span>
            <span>·</span>
            <span>{readingTime(article.content)} {minRead}</span>
            <span>·</span>
            <span>{sourceLabel}: {article.sourceName}</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link href={articleHref} className="group flex gap-3 py-3 border-b border-white/5 last:border-0">
        {article.imageUrl ? (
          <img src={article.imageUrl} alt="" className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-bg-elevated" loading="lazy" />
        ) : (
          <div className="w-16 h-16 rounded-md gradient-mesh flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {cat && <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cat.color }}>{cat.name}</span>}
          <h3 className="font-semibold leading-snug group-hover:text-accent transition line-clamp-2">{article.title}</h3>
          <div className="mt-1 text-xs text-muted">{time}</div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={articleHref}
      className="group block rounded-xl bg-bg-card border border-white/5 hover:border-accent/40 transition overflow-hidden"
    >
      {article.imageUrl ? (
        <div className="aspect-[16/9] w-full overflow-hidden bg-bg-elevated">
          <img src={article.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500" />
        </div>
      ) : (
        <div className="aspect-[16/9] gradient-mesh" />
      )}
      <div className="p-5">
        {cat && (
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cat.color }}>
            {cat.emoji} {cat.name}
          </span>
        )}
        <h3 className="mt-2 text-xl font-display font-bold leading-tight group-hover:text-accent transition line-clamp-3">
          {article.title}
        </h3>
        <p className="mt-2 text-sm text-white/60 line-clamp-2">{article.excerpt}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
          <span>{time}</span>
          <span>·</span>
          <span>{readingTime(article.content)} {minLabel}</span>
          <span>·</span>
          <span>{article.sourceName}</span>
        </div>
      </div>
    </Link>
  );
}
