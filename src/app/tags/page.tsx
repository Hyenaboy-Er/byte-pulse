// Tags index — browse the site by topic. Boosts internal-link density and
// gives readers a discovery path beyond categories.

import { prisma } from '@/lib/db';
import Link from 'next/link';

export const metadata = {
  title: 'Browse by topic',
  description: 'All Byte-Pulse coverage tags — browse the archive by topic.',
  alternates: { canonical: '/tags' },
};

export const revalidate = 1800; // 30min

function safeTags(s: string): string[] {
  try { return JSON.parse(s) as string[]; } catch { return []; }
}

export default async function TagsIndex() {
  const articles = await prisma.article.findMany({
    where: { status: 'published' },
    select: { tags: true },
    take: 1000,
  });

  // Count tag frequency across the corpus
  const counts = new Map<string, number>();
  for (const a of articles) {
    for (const tag of safeTags(a.tags)) {
      const t = tag.toLowerCase().trim();
      if (t.length < 2 || t.length > 30) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 200);

  // Visual sizing: bigger font for more popular tags (tag-cloud effect)
  const maxCount = sorted[0]?.[1] ?? 1;
  const sizeFor = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.6) return 'text-2xl';
    if (ratio > 0.3) return 'text-xl';
    if (ratio > 0.15) return 'text-lg';
    return 'text-base';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-display font-extrabold tracking-tight mb-3">Browse by topic</h1>
      <p className="text-white/70 mb-10 max-w-2xl">
        Every story is tagged. Click any topic to see the full coverage archive. The size of each
        tag reflects how often it appears across our {articles.length} most-recent articles.
      </p>

      <div className="flex flex-wrap gap-x-3 gap-y-2 leading-relaxed">
        {sorted.map(([tag, count]) => (
          <Link
            key={tag}
            href={`/tag/${encodeURIComponent(tag)}`}
            className={`${sizeFor(count)} text-white/85 hover:text-accent transition`}
          >
            #{tag}
            <span className="text-[10px] text-muted ml-1">{count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
