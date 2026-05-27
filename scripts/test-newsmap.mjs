import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

const url = process.env.DATABASE_URL;
const isCloud = url?.startsWith('libsql:');
let prisma;
if (isCloud) {
  const adapter = new PrismaLibSQL({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  prisma = new PrismaClient({ adapter });
} else {
  prisma = new PrismaClient();
}

console.log('DB:', isCloud ? 'Turso libsql' : 'local');
const cutoff = new Date(Date.now() - 48 * 3600_000);
console.log('Cutoff:', cutoff.toISOString());

try {
  const articles = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: cutoff }, qualityScore: { gte: 0 } },
    orderBy: { publishedAt: 'desc' },
    take: 5,
  });
  console.log('Articles found (last 48h):', articles.length);
  if (articles[0]) {
    console.log('Sample article fields:', Object.keys(articles[0]));
    console.log('Sample:', {
      id: articles[0].id,
      title: articles[0].title?.slice(0, 50),
      slug: articles[0].slug,
      publishedAt: articles[0].publishedAt,
      imageUrl: articles[0].imageUrl?.slice(0, 50),
    });
  }

  const ids = articles.map(a => a.id);
  const trs = ids.length
    ? await prisma.translation.findMany({ where: { articleId: { in: ids }, lang: 'de' } })
    : [];
  console.log('Translations DE:', trs.length);

  const last = await prisma.agentLog.findFirst({
    where: { agent: 'adsense-robo', action: 'control' },
    orderBy: { createdAt: 'desc' },
  });
  console.log('Last adsense-robo run:', last ? {
    at: last.createdAt,
    status: last.status,
    msg: last.message?.slice(0, 200),
  } : 'NONE');

  // Total counts
  const total = await prisma.article.count({ where: { status: 'published' } });
  console.log('Total published articles:', total);
} catch (e) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
}
await prisma.$disconnect();
