import { prisma } from '../lib/db';
(async () => {
  const a = await prisma.article.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!a) { console.log('keine Artikel'); process.exit(1); }
  console.log('Titel:     ', a.title);
  console.log('Subtitle:  ', a.subtitle);
  console.log('Excerpt:   ', a.excerpt);
  console.log('Kategorie: ', a.category);
  console.log('Tags:      ', a.tags);
  console.log('Quelle:    ', a.sourceName, a.sourceUrl);
  console.log('Bild:      ', a.imageUrl ? 'JA — ' + a.imageUrl : 'NEIN');
  console.log('Score:     ', a.qualityScore);
  console.log('Slug:      ', a.slug);
  console.log('\n--- Content ---\n');
  console.log(a.content);
})();
