// Keyword Research Agent
// Pulls trending topics from three FREE, no-auth sources:
//   1. Hacker News top stories (Y Combinator)
//   2. Reddit hot threads from major tech subs
//   3. Google Suggest autocomplete (real search queries people type)
//
// Output is used to:
//   - BOOST story-picker score for stories that match trending topics
//   - INFORM writer prompt with trending keywords/queries to weave into headlines

const UA = 'Mozilla/5.0 BytePulseBot/1.0';

export type TrendSignal = {
  source: 'hn' | 'reddit' | 'suggest' | 'cluster';
  text: string;
  weight: number; // 0-100, higher = hotter
};

export type TrendsSnapshot = {
  fetchedAt: string;
  hnTitles: string[];
  redditTitles: string[];
  googleSuggestions: string[];
  topics: string[]; // de-duplicated, lowercased keywords/phrases
  signals: TrendSignal[];
};

// ------------- Hacker News -------------

async function fetchHackerNewsHot(limit = 30): Promise<{ titles: string[]; signals: TrendSignal[] }> {
  try {
    const ids = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      signal: AbortSignal.timeout(8000),
    }).then((r) => r.json()) as number[];
    const top = ids.slice(0, limit);
    const items = await Promise.all(
      top.map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(5000) })
          .then((r) => r.json())
          .catch(() => null)
      )
    );
    const titles: string[] = [];
    const signals: TrendSignal[] = [];
    items.forEach((it: any, idx) => {
      if (!it?.title) return;
      titles.push(it.title);
      // higher up = hotter
      const weight = Math.round(100 - (idx / limit) * 70);
      signals.push({ source: 'hn', text: it.title, weight });
    });
    return { titles, signals };
  } catch {
    return { titles: [], signals: [] };
  }
}

// ------------- Reddit -------------

const REDDIT_SUBS = ['technology', 'gadgets', 'Apple', 'Android', 'MachineLearning', 'programming', 'cybersecurity', 'crypto', 'gaming'];

async function fetchRedditHot(limit = 15): Promise<{ titles: string[]; signals: TrendSignal[] }> {
  const titles: string[] = [];
  const signals: TrendSignal[] = [];
  await Promise.all(
    REDDIT_SUBS.map(async (sub) => {
      try {
        const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=${limit}`, {
          headers: { 'user-agent': UA },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;
        const data = await res.json();
        const children = (data?.data?.children ?? []) as any[];
        children.forEach((c, idx) => {
          const title = c?.data?.title as string | undefined;
          const score = (c?.data?.score as number | undefined) ?? 0;
          if (!title) return;
          titles.push(title);
          // weight = upvotes-derived, capped 100
          const weight = Math.min(100, Math.round(20 + Math.log10(Math.max(1, score)) * 20));
          signals.push({ source: 'reddit', text: title, weight });
        });
      } catch {
        /* ignore single-sub failures */
      }
    })
  );
  return { titles, signals };
}

// ------------- Google Suggest -------------

const SUGGEST_SEEDS = [
  'iphone', 'samsung', 'pixel', 'macbook',
  'gpt', 'claude', 'gemini', 'sora', 'ai',
  'tesla', 'crypto', 'bitcoin',
  'rtx', 'gpu', 'cpu',
  'security breach', 'data leak',
  'playstation', 'xbox', 'switch 2', 'gta 6',
];

async function fetchGoogleSuggestions(): Promise<{ suggestions: string[]; signals: TrendSignal[] }> {
  const suggestions: string[] = [];
  const signals: TrendSignal[] = [];
  await Promise.all(
    SUGGEST_SEEDS.map(async (seed) => {
      try {
        const url = `http://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(seed)}`;
        const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const data = await res.json() as [string, string[]];
        const items = data?.[1] ?? [];
        items.slice(0, 8).forEach((s) => {
          suggestions.push(s);
          // earlier suggestion = hotter (Google ranks by search volume + trend)
          signals.push({ source: 'suggest', text: s, weight: 60 });
        });
      } catch {
        /* ignore */
      }
    })
  );
  return { suggestions, signals };
}

// ------------- Topic extraction -------------

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'is', 'are', 'was', 'were',
  'this', 'that', 'these', 'those', 'it', 'its', 'as', 'by', 'from', 'be', 'been', 'has', 'have', 'had', 'will',
  'can', 'could', 'should', 'would', 'may', 'might', 'just', 'now', 'new', 'how', 'what', 'why', 'when', 'who',
  'we', 'you', 'they', 'i', 'us', 'our', 'your', 'their', 'his', 'her', 'one', 'two', 'three',
  'over', 'under', 'about', 'after', 'before', 'into', 'than', 'then', 'so', 'if', 'not', 'no', 'do', 'does', 'did',
  'get', 'got', 'make', 'makes', 'made', 'go', 'goes', 'going',
]);

function extractKeyTerms(titles: string[]): string[] {
  const counts = new Map<string, number>();
  for (const t of titles) {
    const words = t.toLowerCase()
      .replace(/[^a-z0-9\s\-+]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));
    // unigrams
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
    // bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const gram = `${words[i]} ${words[i + 1]}`;
      if (gram.length >= 7) counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([_, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([w]) => w);
}

// ------------- Main API -------------

let cache: { snapshot: TrendsSnapshot; expiresAt: number } | null = null;

export async function getCurrentTrends(): Promise<TrendsSnapshot> {
  // Cache 30 minutes — trends don't shift faster than that, and we don't want to hammer APIs
  if (cache && Date.now() < cache.expiresAt) return cache.snapshot;

  const [hn, reddit, suggest] = await Promise.all([
    fetchHackerNewsHot(30),
    fetchRedditHot(15),
    fetchGoogleSuggestions(),
  ]);

  const allTitles = [...hn.titles, ...reddit.titles, ...suggest.suggestions];
  const topics = extractKeyTerms(allTitles);

  const snapshot: TrendsSnapshot = {
    fetchedAt: new Date().toISOString(),
    hnTitles: hn.titles,
    redditTitles: reddit.titles,
    googleSuggestions: suggest.suggestions,
    topics,
    signals: [...hn.signals, ...reddit.signals, ...suggest.signals],
  };

  cache = { snapshot, expiresAt: Date.now() + 30 * 60_000 };
  return snapshot;
}

// Score how well a story matches current trends. 0-1 multiplier for picker.
export function trendsBoost(storyTitle: string, snapshot: TrendsSnapshot): number {
  if (!snapshot.topics.length) return 0;
  const lower = storyTitle.toLowerCase();
  let hits = 0;
  let weighted = 0;
  for (let i = 0; i < snapshot.topics.length; i++) {
    if (lower.includes(snapshot.topics[i])) {
      hits++;
      // top topics weigh more
      weighted += Math.max(0.3, 1 - i / snapshot.topics.length);
    }
  }
  if (!hits) return 0;
  // cap at 1.0 (= +100% picker boost)
  return Math.min(1, weighted / 3);
}
