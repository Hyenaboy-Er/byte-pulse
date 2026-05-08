// Fill: generate N fresh articles AND translate ALL published to DE.
// Goal: site looks rich + complete in both languages, fast.
import { runOnce } from '../lib/agents/orchestrator';
import { translateArticle } from '../lib/agents/translator';
import { prisma } from '../lib/db';

const TARGET = Number(process.env.TARGET_ARTICLES ?? '15');

async function main() {
  console.log(`[fill] target: ${TARGET} new articles + DE translations for everything`);

  let published = 0;
  let attempts = 0;
  const MAX_ATTEMPTS = TARGET * 3; // worst case 1/3 publish rate

  while (published < TARGET && attempts < MAX_ATTEMPTS) {
    attempts++;
    try {
      const r = await runOnce();
      if (r.published) {
        published++;
        console.log(`[fill] [${published}/${TARGET}] published: ${r.published.slug}`);
      } else if (r.review) {
        console.log(`[fill] attempt ${attempts}: ${r.review.verdict} (score=${r.review.score})`);
      } else if (r.error) {
        console.log(`[fill] attempt ${attempts}: error — ${r.error}`);
      } else {
        console.log(`[fill] attempt ${attempts}: skipped`);
      }
    } catch (err) {
      console.warn(`[fill] attempt ${attempts}: exception — ${(err as Error).message}`);
    }
  }

  console.log(`[fill] generation phase done — ${published} new articles in ${attempts} attempts.`);

  // Translate every published article to DE that doesn't already have a translation
  const allPublished = await prisma.article.findMany({
    where: { status: 'published' },
    select: { id: true, slug: true, title: true },
  });
  const existingTrs = await prisma.translation.findMany({
    where: { lang: 'de' },
    select: { articleId: true },
  });
  const haveDe = new Set(existingTrs.map((t) => t.articleId));
  const todo = allPublished.filter((a) => !haveDe.has(a.id));

  console.log(`\n[fill] DE translations: ${haveDe.size} cached, ${todo.length} to translate.`);

  // Run translations in parallel batches to be quick but not slam the API
  const BATCH = 4;
  let done = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (a) => {
        try {
          await translateArticle(a.id, 'de');
          done++;
          console.log(`[fill] [DE ${done}/${todo.length}] ${a.slug}`);
        } catch (err) {
          console.warn(`[fill] DE failed for ${a.slug}: ${(err as Error).message}`);
        }
      })
    );
  }

  const finalEN = await prisma.article.count({ where: { status: 'published' } });
  const finalDE = await prisma.translation.count({ where: { lang: 'de' } });

  console.log(`\n=========================================`);
  console.log(`[fill] DONE`);
  console.log(`  Articles published: ${finalEN}`);
  console.log(`  DE translations:    ${finalDE}`);
  console.log(`=========================================`);

  process.exit(0);
}

main().catch((err) => {
  console.error('[fill] fatal:', err);
  process.exit(1);
});
