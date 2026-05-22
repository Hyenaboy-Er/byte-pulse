// Title-Booster agent — scans published articles with high impressions but
// low CTR (or just recent articles) and rewrites the title into a more
// click-magnet form WITHOUT inventing facts. Idempotent: skips titles already
// boosted (marked via meta.boosted = true on the agentLog).
//
// Rule: stronger verbs, numbers from the source, curiosity gap that doesn't
// lie. Same factuality rules as the Writer apply.

import { prisma } from '../db';
import { chat, MODELS, extractJson } from '../openai';
import { tg } from '../telegram';
import { pingIndexNow } from '../indexnow';
import { SITE } from '../site';

const SITE_URL = SITE.url;

const BOOSTER_SYSTEM = `You are the headline editor for Byte-Pulse, a tech news magazine. Your ONLY job: produce a STRONGER click-magnet rewrite of the given title. ALWAYS rewrite — even if the original is decent, find a punchier angle.

ABSOLUTE FACT RULE:
- NEVER invent numbers, products, dates, or claims that aren't in the original excerpt/subtitle.
- If the original says "Samsung faces 18-day strike threat" you can use "18-day" but not "30-day".
- If unsure about a number, leave it out — don't fabricate.

CLICK-MAGNET RULES (force a rewrite that follows these):
- 50-75 chars (count carefully).
- Lead with a NUMBER or CONCRETE NOUN whenever the source supports it.
- Use ONE strong active verb: drops, kills, leaks, ships, throttles, cuts, doubles, breaks, warns, pivots, scraps, revives, folds, sues, settles, denies, admits, concedes, taps, ditches, slashes, wipes, threatens, scrambles, sparks, jolts, blocks, halts, exposes, hits.
- Add a STAKE or CONSEQUENCE for the reader: "for cheaper Macs", "at half price", "—and it's free", "before launch", "could spike SSD prices", "could hit your next SSD".
- Reader-facing language. Replace abstract enterprise phrasing with what people actually search.
- BANNED phrases: "Threatens Stability", "Transforms Industry", "Leverages Opportunities", "shocking", "you won't believe", "what happened next", "experts hate", "this changes everything", "the truth about", colons followed by vague phrases.

REWRITE EXAMPLES (showing exactly the level of upgrade I want):
- "Samsung Labor Strike Threatens Memory Market Stability"
  → "Samsung 18-Day Strike Could Spike SSD and RAM Prices"
- "Sony Leverages AI to Transform Game Development"
  → "Sony Says AI Will Speed Up PS5 Game Builds for Players"
- "Apple Gets Court OK to Seek Samsung Docs in Antitrust Fight"
  → "Apple Wins Court Subpoena for Samsung Files in Antitrust Case"
- "Checkmarx Jenkins Plugin Compromised by TeamPCP Malware"
  → "TeamPCP Malware Hits Checkmarx Jenkins Plugin — Devs At Risk"

Only return changed=false if the original literally cannot be improved without inventing facts.

Reply with strict JSON: {"title": "...", "changed": true|false, "reason": "<1-sentence why>"}`;

export type TitleBoosterReport = {
  scanned: number;
  rewritten: number;
  skipped: number;
  examples: { slug: string; oldTitle: string; newTitle: string }[];
};

export async function runTitleBooster(opts?: { limit?: number; minViews?: number; force?: boolean }): Promise<TitleBoosterReport> {
  const limit = Math.max(1, Math.min(60, opts?.limit ?? 25));
  const minViews = Math.max(0, opts?.minViews ?? 5);
  const force = opts?.force === true;

  // Articles eligible for boost: published, not-already-boosted, sorted by views DESC.
  // We use the agentLog as the boosted-flag store so we don't need a schema change.
  const candidates = await prisma.article.findMany({
    where: { status: 'published', views: { gte: minViews } },
    orderBy: { views: 'desc' },
    take: limit * 2, // overshoot, then filter out boosted
    select: { id: true, slug: true, title: true, subtitle: true, excerpt: true, category: true },
  });

  // When force=true we skip the dedupe so already-boosted titles get a second pass.
  // This is useful after tightening the booster prompt.
  const boostedSlugs = force ? new Set<string>() : new Set(
    (await prisma.agentLog.findMany({
      where: { agent: 'title-booster', action: 'boost', status: 'success' },
      select: { message: true },
    }))
      .map((l) => (l.message ?? '').split('|')[0])
      .filter(Boolean)
  );

  const examples: TitleBoosterReport['examples'] = [];
  let rewritten = 0;
  let skipped = 0;
  let scanned = 0;

  for (const a of candidates) {
    if (rewritten >= limit) break;
    if (boostedSlugs.has(a.slug)) { skipped++; continue; }
    scanned++;

    try {
      const prompt = `Original title: ${a.title}
Subtitle: ${a.subtitle ?? '(none)'}
Excerpt: ${a.excerpt ?? '(none)'}
Category: ${a.category}

Rewrite into a click-magnet title following the rules. JSON only.`;

      const res = await chat({
        model: MODELS.humanizer,
        system: BOOSTER_SYSTEM,
        user: prompt,
        json: true,
        maxTokens: 200,
        temperature: 0.7,
      });

      const parsed = extractJson(res) as { title?: string; changed?: boolean | string; reason?: string } | null;
      const newTitle = String(parsed?.title ?? '').trim();
      // Lenient: accept if the LLM returned a different title that passes length validation,
      // regardless of how it filled the `changed` flag. The model is unreliable with the
      // boolean — but if the title text differs from the original, that's the actual signal.
      const titleDiffers = newTitle && newTitle !== a.title && newTitle.length >= 30 && newTitle.length <= 100;
      const llmFlaggedChange = parsed?.changed === true || parsed?.changed === 'true';
      const changed = titleDiffers && (llmFlaggedChange || titleDiffers); // titleDiffers alone is enough

      if (changed) {
        await prisma.article.update({ where: { id: a.id }, data: { title: newTitle } });
        examples.push({ slug: a.slug, oldTitle: a.title, newTitle });
        rewritten++;
        // Re-ping IndexNow so search engines pick up the new title fast
        pingIndexNow([`${SITE_URL}/article/${a.slug}`]).catch(() => null);
      }

      // Log success/skip for idempotency
      await prisma.agentLog.create({
        data: {
          agent: 'title-booster',
          action: 'boost',
          status: 'success',
          message: `${a.slug}|${changed ? 'changed' : 'kept'}`,
          meta: JSON.stringify({ oldTitle: a.title, newTitle: changed ? newTitle : null }),
        },
      });
    } catch (err) {
      await prisma.agentLog.create({
        data: {
          agent: 'title-booster',
          action: 'boost',
          status: 'error',
          message: `${a.slug}|${(err as Error).message.slice(0, 100)}`,
        },
      }).catch(() => null);
    }
  }

  // Telegram heads-up when at least 3 titles were boosted in this run
  if (rewritten >= 3) {
    const lines = [`🚀 Title-Booster · ${rewritten} Titel verstärkt (${skipped} bereits boosted)`, ''];
    for (const e of examples.slice(0, 8)) {
      lines.push(`  · ${e.oldTitle.slice(0, 50)}…`);
      lines.push(`  → ${e.newTitle}`);
      lines.push('');
    }
    await tg(lines.join('\n'));
  }

  return { scanned, rewritten, skipped, examples };
}
