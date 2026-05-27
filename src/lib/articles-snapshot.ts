// Read-only fallback source for article queries when the Turso DB is
// unavailable (quota exhausted, network blip, schema drift). The snapshot
// was crawled from the live site via scripts/snapshot-from-live.mjs; refresh
// it any time the DB is healthy by re-running that script.
//
// Shape matches the Prisma Article model (minus internal-only fields), so
// existing code that consumes findMany/findUnique can swap in seamlessly.
import indexData from '../../data/articles-index.json';
import fullData from '../../data/articles-snapshot.json';

export type SnapshotArticle = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  imageUrl: string | null;
  imageCredit: string | null;
  sourceUrl: string;
  sourceName: string;
  originalTitle: string | null;
  qualityScore: number;
  status: string;
  views: number;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  author?: string;
  wordCount?: number;
};

const index = indexData as unknown as Omit<SnapshotArticle, 'content'>[];
const full = fullData as unknown as SnapshotArticle[];
const bySlug = new Map(full.map((a) => [a.slug, a]));

// Sorted desc by publishedAt — same order Prisma returns with orderBy desc.
const sortedIndex = [...index].sort(
  (a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime(),
);

export function snapshotListPublished(opts: {
  category?: string;
  take?: number;
  publishedAfter?: Date;
} = {}): SnapshotArticle[] {
  const { category, take = 50, publishedAfter } = opts;
  let list = sortedIndex.filter(
    (a) =>
      a.status === 'published' &&
      a.qualityScore >= 0 &&
      (!category || a.category === category) &&
      (!publishedAfter || new Date(a.publishedAt ?? 0) >= publishedAfter),
  );
  return list.slice(0, take) as SnapshotArticle[];
}

export function snapshotFindBySlug(slug: string): SnapshotArticle | null {
  return bySlug.get(slug) ?? null;
}

export function snapshotCountPublished(): number {
  return sortedIndex.filter((a) => a.status === 'published').length;
}

export function snapshotAllSlugs(): string[] {
  return sortedIndex.map((a) => a.slug);
}

// Convert snapshot to a shape that callers expecting Prisma's Date objects
// can use. Many callers do `.toISOString()` or `.toUTCString()` on dates.
export function snapshotToPrismaShape<T extends SnapshotArticle>(a: T) {
  return {
    ...a,
    publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
    createdAt: a.createdAt ? new Date(a.createdAt) : new Date(0),
    updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(0),
  };
}
