// Single read-side facade: tries Turso first, falls back to the static
// snapshot when the DB throws (e.g. Turso free-plan reads blocked). The
// rest of the app calls these helpers instead of prisma.article directly,
// so quota issues never reach the user.
//
// Writes still go through Prisma — the snapshot is read-only.
import { prisma } from './db';
import {
  snapshotListPublished,
  snapshotFindBySlug,
  snapshotCountPublished,
  snapshotAllSlugs,
  snapshotToPrismaShape,
  type SnapshotArticle,
} from './articles-snapshot';

type PrismaArticle = Awaited<ReturnType<typeof prisma.article.findFirst>>;

function note(where: string, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  // Trim noisy multi-line Prisma traces in serverless logs.
  console.warn(`[articles-source] ${where} fell back to snapshot:`, msg.split('\n')[0].slice(0, 160));
}

export async function listPublished(opts: {
  category?: string;
  take?: number;
  publishedAfter?: Date;
} = {}) {
  try {
    const where: any = { status: 'published' };
    if (opts.category) where.category = opts.category;
    if (opts.publishedAfter) where.publishedAt = { gte: opts.publishedAfter };
    const list = await prisma.article.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: opts.take ?? 50,
    });
    if (list.length > 0) return list;
    // Empty result while snapshot has data → DB likely fresh-after-reset
    // but we still want the snapshot if it has more — caller may prefer it.
    return list;
  } catch (e) {
    note('listPublished', e);
    return snapshotListPublished(opts).map(snapshotToPrismaShape);
  }
}

export async function findBySlug(slug: string): Promise<PrismaArticle | null> {
  try {
    return await prisma.article.findUnique({ where: { slug } });
  } catch (e) {
    note('findBySlug', e);
    const a = snapshotFindBySlug(slug);
    return a ? (snapshotToPrismaShape(a) as any) : null;
  }
}

export async function findManyByIds(ids: string[]): Promise<PrismaArticle[]> {
  if (!ids.length) return [];
  try {
    return await prisma.article.findMany({ where: { id: { in: ids } } });
  } catch (e) {
    note('findManyByIds', e);
    // Snapshot uses slug as id (synthetic) — fall back per-slug.
    return ids
      .map((id) => snapshotFindBySlug(id))
      .filter(Boolean)
      .map((a) => snapshotToPrismaShape(a as SnapshotArticle) as any);
  }
}

export async function countPublished(): Promise<number> {
  try {
    return await prisma.article.count({ where: { status: 'published' } });
  } catch (e) {
    note('countPublished', e);
    return snapshotCountPublished();
  }
}

export async function allSlugs(): Promise<string[]> {
  try {
    const rows = await prisma.article.findMany({
      where: { status: 'published' },
      select: { slug: true },
      orderBy: { publishedAt: 'desc' },
    });
    return rows.map((r) => r.slug);
  } catch (e) {
    note('allSlugs', e);
    return snapshotAllSlugs();
  }
}

// Specialty: for the news sitemap (last 48h)
export async function listRecentForNewsSitemap(hoursBack = 48) {
  const after = new Date(Date.now() - hoursBack * 3_600_000);
  return listPublished({ publishedAfter: after, take: 1000 });
}
