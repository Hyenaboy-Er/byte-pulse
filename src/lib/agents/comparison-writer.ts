// Comparison / buying-guide longform agent (#25).
//
// User brief (Tag 7): the SEO audit's only real finding was thin,
// aggregation-only content (HCU risk). The fix is anchor longform with
// genuine original value — head-to-head comparisons people actually
// search for ("iphone 17 pro max vs pixel 9 pro xl"). These rank for
// high-commercial-intent queries, convert affiliate, and read human
// because they ARE substantive — not because of detection tricks.
//
// Output: 1400-1900 word structured comparison, founder byline (Serhat
// Er via the x-vs-y slug pattern → authorForArticle), run through the
// (now length-preserving) humanizer for voice, published like any other
// article. Dedup by slug so we never write the same matchup twice.
//
// Cron: /api/comparison — a few times a week is plenty (these are
// evergreen; spamming them dilutes quality and triggers scaled-content
// flags, the exact opposite of the goal).

import { prisma } from '../db';
import { chat, MODELS, extractJson } from '../openai';
import { slugify } from '../slugify';
import { CATEGORIES } from '../categories';
import { tg } from '../telegram';
import { SITE } from '../site';

// Stable sentinel that flags a flagship-longform piece as written under the
// founder byline. Derived from SITE.name so the writer and the byline router
// (authors.ts) always agree — a clone needs zero edits in either file.
export const ORIGINAL_SOURCE_NAME = `${SITE.name} Original`;

// High-intent evergreen matchups. Ordered by rough search demand. The
// agent walks this list and writes the first one it hasn't covered yet.
// Add freely — keep them genuinely comparable (same category, same buyer).
// Broad, high-search-volume matchups across everything people actually
// shop for — including UPCOMING / rumored flagships (those "X vs Y"
// queries spike hard months before release and we want to own them
// early). Kept genuinely comparable (same buyer, same category). The
// agent walks this top-to-bottom and writes the first one not yet
// covered, so order ≈ priority. Add freely.
const QUEUE: { a: string; b: string; category: string }[] = [
  // ── Smartphones: current flagships ──
  { a: 'iPhone 17 Pro Max', b: 'Google Pixel 9 Pro XL', category: 'mobile' },
  { a: 'iPhone 17 Pro', b: 'Samsung Galaxy S25 Ultra', category: 'mobile' },
  { a: 'Samsung Galaxy S25 Ultra', b: 'Google Pixel 9 Pro XL', category: 'mobile' },
  { a: 'iPhone 17', b: 'Samsung Galaxy S25', category: 'mobile' },
  { a: 'iPhone 17 Pro Max', b: 'Samsung Galaxy S25 Ultra', category: 'mobile' },
  { a: 'Google Pixel 9 Pro', b: 'Samsung Galaxy S25', category: 'mobile' },
  { a: 'iPhone 16 Pro Max', b: 'iPhone 17 Pro Max', category: 'mobile' },
  { a: 'OnePlus 13', b: 'Samsung Galaxy S25 Ultra', category: 'mobile' },
  { a: 'Nothing Phone 3', b: 'Google Pixel 9', category: 'mobile' },
  { a: 'Xiaomi 15 Ultra', b: 'iPhone 17 Pro Max', category: 'mobile' },
  // ── Smartphones: upcoming / rumored (own the query early) ──
  { a: 'iPhone 18 Pro Max', b: 'Google Pixel 10 Pro XL', category: 'mobile' },
  { a: 'iPhone 18 Pro Max', b: 'Samsung Galaxy S26 Ultra', category: 'mobile' },
  { a: 'Samsung Galaxy S26 Ultra', b: 'Google Pixel 10 Pro XL', category: 'mobile' },
  { a: 'iPhone 18', b: 'iPhone 17', category: 'mobile' },
  { a: 'Samsung Galaxy Z Fold 7', b: 'Google Pixel 10 Pro Fold', category: 'mobile' },
  // ── Foldables ──
  { a: 'Samsung Galaxy Z Flip 7', b: 'Motorola Razr 2025', category: 'mobile' },
  // ── TVs ──
  { a: 'LG OLED C5', b: 'Samsung S95F QD-OLED', category: 'hardware' },
  { a: 'Samsung QN90F Neo QLED', b: 'LG OLED C5', category: 'hardware' },
  { a: 'Sony Bravia 9', b: 'LG G5 OLED', category: 'hardware' },
  { a: 'TCL QM8 2025', b: 'Hisense U8N', category: 'hardware' },
  { a: 'LG G5 OLED', b: 'Samsung S95F QD-OLED', category: 'hardware' },
  // ── Laptops ──
  { a: 'MacBook Air M4', b: 'Dell XPS 13', category: 'hardware' },
  { a: 'MacBook Pro M4', b: 'ASUS ROG Zephyrus G16', category: 'hardware' },
  { a: 'MacBook Air M4', b: 'MacBook Pro M4', category: 'hardware' },
  { a: 'Framework Laptop 13', b: 'Dell XPS 13', category: 'hardware' },
  // ── GPUs / PC ──
  { a: 'RTX 5080', b: 'RTX 4090', category: 'hardware' },
  { a: 'RTX 5090', b: 'RTX 4090', category: 'hardware' },
  { a: 'RTX 5070 Ti', b: 'RX 9070 XT', category: 'hardware' },
  // ── Consoles / handhelds ──
  { a: 'PlayStation 5 Pro', b: 'Xbox Series X', category: 'gaming' },
  { a: 'Nintendo Switch 2', b: 'Steam Deck OLED', category: 'gaming' },
  { a: 'Steam Deck OLED', b: 'ASUS ROG Ally X', category: 'gaming' },
  { a: 'ASUS ROG Ally X', b: 'Lenovo Legion Go', category: 'gaming' },
  // ── Audio / wearables ──
  { a: 'AirPods Pro 3', b: 'Sony WF-1000XM5', category: 'mobile' },
  { a: 'Sony WH-1000XM6', b: 'Bose QuietComfort Ultra', category: 'mobile' },
  { a: 'Apple Watch Series 11', b: 'Samsung Galaxy Watch 8', category: 'mobile' },
  { a: 'Apple Watch Ultra 3', b: 'Garmin Fenix 8', category: 'mobile' },
  // ── Tablets ──
  { a: 'iPad Pro M4', b: 'Samsung Galaxy Tab S10 Ultra', category: 'mobile' },
  { a: 'iPad Air M3', b: 'iPad Pro M4', category: 'mobile' },
  // ── EV / auto ──
  { a: 'Tesla Model 3', b: 'BYD Seal', category: 'ev' },
  { a: 'Tesla Model Y', b: 'Hyundai Ioniq 5', category: 'ev' },
  { a: 'Tesla Model 3', b: 'Polestar 2', category: 'ev' },
  // ── AI / software services ──
  { a: 'ChatGPT Plus', b: 'Claude Pro', category: 'ai' },
  { a: 'ChatGPT Plus', b: 'Google Gemini Advanced', category: 'ai' },
  { a: 'Claude Pro', b: 'Google Gemini Advanced', category: 'ai' },
  { a: 'Perplexity Pro', b: 'ChatGPT Plus', category: 'ai' },
  { a: 'Proton Mail', b: 'Gmail', category: 'software' },
  { a: 'Notion', b: 'Obsidian', category: 'software' },
  { a: 'Proton VPN', b: 'NordVPN', category: 'software' },
];

const SYSTEM = `You are ${SITE.founderName}, founder and editor of ${SITE.name}. You write the site's
flagship head-to-head buying guides. Your reputation is built on being the person who
actually read every spec sheet and current price, and lays out the real trade-offs
clearly and FAIRLY so the reader can decide for themselves.

EDITORIAL STANCE — strict neutrality (this is a hard rule):
- NEVER declare an overall "winner". No "my pick", no "I'd take", no "the better
  phone is". You present, the reader decides.
- Never favour or disparage any company (Apple, Google, Samsung, etc.). Both
  products get their genuine strengths AND honest limitations, in equal measure.
- Every recommendation is conditional, framed as the reader's choice:
  "If a long software-support window matters most to you, A fits that.
   If you want the most flexible camera system, B leans that way."
- No loaded adjectives that tilt the scale ("disappointing", "embarrassing").
  State the fact; let the reader judge.
- It is fine — expected — to say a given dimension is genuinely close or a tie.

VOICE — keep this, the reader liked it (just neutral now, not opinionated):
- Warm, plainspoken, a real person talking. Light first person is fine for
  framing ("Let's lay both out side by side"), never for verdicts.
- Vary sentence length hard. Some one-liners. Some longer with a clause that
  earns its keep. The occasional fragment. For rhythm.
- Dry, specific, a touch wry. Never breathless. Never "in today's fast-paced world".

STRUCTURE (Markdown, 1400-1900 words — anchor longform, not a blog post):
1. Opening: the real question a buyer has at 11pm with a cart open. Make clear
   up front this piece won't pick for them — it'll make the choice obvious. 2-3 short paras.
2. "## The 30-second summary" — 3-4 sentences: what A is clearly for, what B is
   clearly for, and the one question the reader should ask themselves to decide.
   NO verdict.
3. "## Specs at a glance" — a Markdown table comparing 7-10 concrete dimensions
   (price, display, chip, RAM/storage tiers, camera, battery, charging,
   software-update window, standout feature). Realistic current figures from
   general knowledge; if a figure is genuinely unknown write "not confirmed" —
   NEVER invent a precise spec.
4. 5-6 "## <Dimension>" sections (Design & build, Display, Performance,
   Camera/Capability, Battery & charging, Software & longevity, Price & value).
   Each: what the numbers say, what it means in daily use, then which buyer
   PRIORITY this dimension favours — framed as "this leans toward A for people
   who…, toward B for people who…", or "genuinely a wash here". No round winner.
5. "## Which one fits you" — neutral decision guide. Named buyer profiles, each
   pointing to whichever device objectively fits that priority:
   "Keep a phone 5+ years and care about updates → A does X. Shoot a lot of
   low-light video → B does Y." Cover 4-5 profiles, balanced both directions.
6. "## The bottom line" — restate, neutrally, that both are excellent in their
   lane; summarise the single trade-off axis the decision really comes down to.
   NO recommendation, NO favourite.

HARD RULES:
- Original value = the clear, fair, balanced breakdown. Never a feature list
  dressed up. Never a verdict.
- No invented benchmarks/prices as fact. Ranges, "around", "roughly" are fine.
- No "in conclusion", "it's worth noting", "game-changing", "in the realm of".
- The reader should finish knowing exactly which fits THEIR priorities — without
  you ever having told them which is "better".

Reply with JSON only:
{
  "title": "<A> vs <B>: <angle> (e.g. 'Which Flagship Actually Earns €1,300?')",
  "subtitle": "one sharp sentence, 80-130 chars",
  "excerpt": "140-160 chars, the verdict teaser, for meta-description",
  "content": "the full Markdown article",
  "tags": ["...", "...", "...", "..."]
}`;

export type ComparisonReport = {
  picked?: string;
  slug?: string;
  words?: number;
  skipped?: string;
  error?: string;
};

function wc(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export async function runComparisonWriter(
  override?: { a: string; b: string; category: string },
): Promise<ComparisonReport> {
  // Pick the first queued matchup we haven't published yet (slug-based).
  let pick = override;
  if (!pick) {
    for (const m of QUEUE) {
      const slug = slugify(`${m.a} vs ${m.b}`);
      const exists = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
      if (!exists) { pick = m; break; }
    }
  }
  if (!pick) return { skipped: 'all queued comparisons already published' };

  const baseSlug = slugify(`${pick.a} vs ${pick.b}`);
  const existing = await prisma.article.findUnique({ where: { slug: baseSlug }, select: { id: true } });
  // Cron/queue mode: skip if already covered (dedup). Explicit ?a=&b=
  // override mode: regenerate and OVERWRITE the existing piece in place
  // (used to re-run with an updated prompt — e.g. the neutrality rewrite).
  if (existing && !override) {
    return { skipped: `already exists: ${baseSlug}` };
  }

  const category = CATEGORIES.some((c) => c.slug === pick.category) ? pick.category : 'mobile';

  let draftRaw: string;
  try {
    draftRaw = await chat({
      model: MODELS.writer,
      system: SYSTEM,
      user: `Write the definitive ${SITE.name} comparison: ${pick.a} vs ${pick.b}.
Category: ${category}. Audience: a buyer about to spend real money who wants
the fair, complete picture so THEY can decide. Make it the page they stop
searching after — because it's the most balanced one, not because it picks for them.`,
      maxTokens: 7000,
      json: true,
    });
  } catch (e) {
    return { picked: `${pick.a} vs ${pick.b}`, error: `writer: ${(e as Error).message}` };
  }

  const draft = extractJson<{
    title: string; subtitle: string; excerpt: string; content: string; tags: string[];
  }>(draftRaw);
  if (!draft?.content) {
    return { picked: `${pick.a} vs ${pick.b}`, error: 'writer JSON parse failed' };
  }

  // LLMs chronically under-deliver on length (asked 1400-1900, got ~800).
  // Rather than reject a genuinely-useful draft, run ONE targeted expand
  // pass: keep every word, deepen the thin sections with concrete detail.
  if (wc(draft.content) < 1200) {
    try {
      const expandedRaw = await chat({
        model: MODELS.writer,
        system: `You are ${SITE.founderName} expanding your own comparison draft. The piece is too thin.
Make it 1400-1900 words by ADDING depth, not padding: more concrete numbers in each
section, a real daily-use scenario per dimension, one extra balanced buyer profile.
Keep EVERY existing sentence and the structure. Same warm, plainspoken voice.
STRICT NEUTRALITY: never add a verdict, a winner, or favour either company —
deepen the fair trade-off analysis only. No filler phrases. Return the SAME JSON shape.`,
        user: `Expand this draft to 1400-1900 words. Current length: ${wc(draft.content)} words.

${JSON.stringify({ title: draft.title, subtitle: draft.subtitle, excerpt: draft.excerpt, content: draft.content, tags: draft.tags }, null, 2)}`,
        maxTokens: 8000,
        json: true,
      });
      const expanded = extractJson<typeof draft>(expandedRaw);
      if (expanded?.content && wc(expanded.content) > wc(draft.content)) {
        draft.title = expanded.title || draft.title;
        draft.subtitle = expanded.subtitle || draft.subtitle;
        draft.excerpt = expanded.excerpt || draft.excerpt;
        draft.content = expanded.content;
        draft.tags = expanded.tags?.length ? expanded.tags : draft.tags;
      }
    } catch { /* keep the original draft — non-fatal */ }
  }

  // NO separate humanizer pass for comparisons. The writer SYSTEM prompt
  // already enforces the warm, neutral, plainspoken voice very strongly,
  // and dropping the extra LLM call keeps the whole run inside Vercel
  // Hobby's hard 60s function cap (writer + optional expand only) — the
  // humanizer was also a corruption surface (it once gutted length and
  // could re-introduce verdict language). Voice is the writer's job here.
  const finalTitle = draft.title;
  const finalSubtitle = draft.subtitle;
  const finalExcerpt = draft.excerpt;
  const finalContent = draft.content;
  const finalTags = draft.tags ?? [];

  const words = wc(finalContent);
  // 750 floor: a tight 800w comparison with a specs table + committed
  // verdict is genuinely useful (Wirecutter/Verge run 800-1200) and far
  // beyond the old 364w aggregation. The expand pass above targets 1400+;
  // this floor just blocks truly broken sub-stub output.
  if (words < 750) {
    return { picked: `${pick.a} vs ${pick.b}`, words, error: 'too short after pipeline, not publishing' };
  }

  // Slug keeps the "x-vs-y" shape so authorForArticle() routes the byline
  // to Serhat Er (founder flagship-longform rule). In override mode we
  // reuse baseSlug exactly and OVERWRITE; in cron mode we uniquify.
  let slug = baseSlug.includes('-vs-') ? baseSlug : slugify(`${pick.a}-vs-${pick.b}`);
  if (override && existing) {
    // Regenerate-in-place: update the existing article's body/title with
    // the freshly written (now neutral) version. No new row, no delete.
    await prisma.article.update({
      where: { id: existing.id },
      data: {
        title: finalTitle,
        subtitle: finalSubtitle ?? null,
        excerpt: finalExcerpt,
        content: finalContent,
        category,
        tags: JSON.stringify(finalTags.slice(0, 6)),
        qualityScore: 85,
        status: 'published',
        publishedAt: new Date(),
      },
    });
  } else {
    for (let i = 2; i < 50 && (await prisma.article.findUnique({ where: { slug }, select: { id: true } })); i++) {
      slug = `${baseSlug}-${i}`;
    }
    await prisma.article.create({
      data: {
        slug,
        title: finalTitle,
        subtitle: finalSubtitle ?? null,
        excerpt: finalExcerpt,
        content: finalContent,
        category,
        tags: JSON.stringify(finalTags.slice(0, 6)),
        imageUrl: null,
        sourceUrl: `${SITE.url}/about`,
        sourceName: ORIGINAL_SOURCE_NAME,
        originalTitle: finalTitle,
        qualityScore: 85,
        status: 'published',
        publishedAt: new Date(),
      },
    });
  }

  // Bust the ISR cache for the touched paths so a regenerate-in-place
  // (or a fresh publish) is visible immediately, not after the 1h
  // revalidate window. Same pattern the orchestrator uses.
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath(`/article/${slug}`);
    revalidatePath('/');
  } catch { /* revalidate is best-effort */ }

  await prisma.agentLog.create({
    data: {
      agent: 'comparison',
      action: `comparison-${slug}`,
      status: 'ok',
      message: `published ${pick.a} vs ${pick.b} (${words}w) as ${slug}`,
    },
  }).catch(() => null);

  await tg(`Comparison published: ${finalTitle} (${words}w) /article/${slug}`, { silent: true }).catch(() => null);

  return { picked: `${pick.a} vs ${pick.b}`, slug, words };
}
