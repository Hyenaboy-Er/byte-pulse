// Entfernt alle Demo-Artikel (erkennbar an example.com / heise.de/example etc.)
// Behält nur echte Artikel mit echten Quellen-URLs.
import { prisma } from '../lib/db';

(async () => {
  const fakes = await prisma.article.findMany({
    where: { OR: [
      { sourceUrl: { contains: 'example.com' } },
      { sourceUrl: { contains: '/example' } },
    ]},
    select: { id: true, title: true, slug: true },
  });
  console.log(`Gefunden: ${fakes.length} Demo-Artikel`);
  for (const f of fakes) console.log(`  - ${f.slug}: ${f.title}`);
  if (fakes.length) {
    await prisma.article.deleteMany({ where: { id: { in: fakes.map((f) => f.id) } } });
    console.log(`\n✓ ${fakes.length} Demo-Artikel gelöscht.`);
  }
  const remaining = await prisma.article.count({ where: { status: 'published' } });
  console.log(`\nÜbrig (echte Artikel): ${remaining}`);
})();
