// "Continue reading" rail rendered at the bottom of every article. Different
// from the same-category "More from X" rail just above it — this one
// deliberately pulls 6 items from OTHER categories so visitors who came for
// an AI story see Gaming / Hardware / EV options too. Drives lateral
// browsing, which directly increases pageviews per session.

import { listPublished } from '@/lib/articles-source';
import { ArticleCard } from '@/components/ArticleCard';

export default async function ContinueReading({
  excludeId,
  excludeCategory,
  hrefPrefix = '',
}: {
  excludeId: string;
  excludeCategory: string;
  hrefPrefix?: string;
}) {
  const isDE = hrefPrefix === '/de';
  const heading = isDE ? 'Auch interessant' : 'Don’t miss these';
  const sub = isDE ? 'Aus anderen Bereichen' : 'From other sections';

  // Pull a fat slice, then bucket per category and round-robin so we don't
  // emit 6 AI cards if AI dominated the last hour.
  // Pull a wide slice across all categories, then filter out the article's
  // own category client-side. Snapshot-aware via listPublished.
  const wide = await listPublished({ take: 40 });
  const pool = wide.filter((a: any) => a.id !== excludeId && a.category !== excludeCategory).slice(0, 24);

  const buckets = new Map<string, typeof pool>();
  for (const a of pool) {
    const list = buckets.get(a.category) ?? [];
    list.push(a);
    buckets.set(a.category, list);
  }
  const picks: typeof pool = [];
  const queues = Array.from(buckets.values()).map((q) => [...q]);
  while (picks.length < 6 && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (!q.length) continue;
      picks.push(q.shift()!);
      if (picks.length >= 6) break;
    }
  }
  if (!picks.length) return null;

  return (
    <section className="mt-14 pt-10 border-t border-white/5">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent font-bold">{sub}</div>
          <h2 className="font-display font-extrabold text-2xl tracking-tight mt-0.5">{heading}</h2>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {picks.map((a) => (
          <ArticleCard key={a.id} article={a} hrefPrefix={hrefPrefix} />
        ))}
      </div>
    </section>
  );
}
