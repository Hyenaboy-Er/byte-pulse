import { prisma } from '../lib/db';
(async () => {
  const all = await prisma.article.findMany({ select: { slug: true } });
  console.log(`[reset] Removing ${all.length} articles + clearing agent state…`);
  await prisma.article.deleteMany({});
  await prisma.seenSource.deleteMany({});
  await prisma.agentLog.deleteMany({});
  console.log('[reset] done.');
  process.exit(0);
})();
