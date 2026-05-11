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
        className="group relative block rounded-2xl bg-bg-card border border-white/5 hover:border-accent/50 transition overflow-hidden hover:shadow-2xl hover:shadow-accent/10 duration-300"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-bg-elevated">
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt=""
              loading="eager"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-700"
            />
          ) : (
            <div className="w-full h-full gradient-mesh" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent" />
          {/* Reading-time pill overlaid on the image — visible without scrolling */}
          <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/55 backdrop-blur text-white/90 border border-white/10">
            <span>⏱</span>
            {readingTime(article.content)} {minRead}
          </div>
        </div>
        <div className="p-6 md:p-8 relative -mt-16 md:-mt-20">
          {cat && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 backdrop-blur"
              style={{ color: cat.color }}
            >
              {cat.emoji} {cat.name}
            </span>
          )}
          <h2 className="mt-4 text-2xl md:text-4xl font-display font-extrabold tracking-tight leading-[1.1] group-hover:text-accent transition">
            {article.title}
          </h2>
          {article.subtitle && (
            <p className="mt-3 text-base md:text-lg text-white/70 max-w-3xl line-clamp-2">{article.subtitle}</p>
          )}
          <div className="mt-4 flex items-center gap-3 text-xs text-muted">
            <span>{time}</span>
            <span>·</span>
            <span>{sourceLabel} {article.sourceName}</span>
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
      className="group relative block rounded-xl bg-bg-card border border-white/5 hover:border-accent/50 transition overflow-hidden hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/10 duration-300"
    >
      {article.imageUrl ? (
        <div className="aspect-[16/9] w-full overflow-hidden bg-bg-elevated relative">
          <img src={article.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.05] transition duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
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
        <p className="mt-2 text-sm text-white/60 line-clamp-2 group-hover:line-clamp-4 transition-all duration-300">{article.excerpt}</p>
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
