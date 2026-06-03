// HotSearchTerms — curated SEO/UX strip of what real US tech readers search
// for right now. Each chip links to /search?q=…, so the strip:
//   - drives SEO: the homepage HTML carries the exact long-tail phrases
//     people type into Google (iPhone 18 Pro Max, Galaxy S26, RTX 5090…).
//     Google's keyword classifier reads the visible text + anchor text +
//     destination query in combination.
//   - drives UX: readers who landed for "iPhone 18 Pro Max" coverage see
//     the term immediately and click through to whatever we have on it.
//
// The list is HAND-CURATED on purpose. Auto-trend lists (HN, Reddit) skew
// toward dev/AI niche; the broad-search audience that drives AdSense impressions
// is shopping for phones, GPUs, AI assistants, consoles, EVs. We mirror that.
// Refresh quarterly — see scripts/refresh-hot-search.mjs (TODO if it pays off).

import Link from 'next/link';

interface Term {
  label: string;        // what shows in the chip
  query: string;        // what we send to /search (often slightly broader)
  emoji?: string;       // small visual hook
  byteCat: 'ai' | 'mobile' | 'hardware' | 'gaming' | 'software' | 'security' | 'ev' | 'science' | 'crypto' | 'web';
}

// All term pools. Ordered roughly by US-search volume. Each term is tagged
// with the byte-pulse category it belongs to, so we can show:
//   - homepage:        a BALANCED mix across categories (4 mobile, 4 AI,
//                      2 hardware, 2 gaming, 1 ev — proportional to a
//                      tech-news magazine, NOT phone-heavy)
//   - category page:   only the terms for that category, deeper coverage
const TERMS: Term[] = [
  // MOBILE — high volume + high AdSense CPC
  { label: 'iPhone 18 Pro Max',     query: 'iPhone 18 Pro Max',     emoji: '📱', byteCat: 'mobile' },
  { label: 'iPhone 18 Pro',         query: 'iPhone 18 Pro',         emoji: '📱', byteCat: 'mobile' },
  { label: 'iPhone 18',             query: 'iPhone 18',             emoji: '📱', byteCat: 'mobile' },
  { label: 'Galaxy S26 Ultra',      query: 'Galaxy S26 Ultra',      emoji: '📱', byteCat: 'mobile' },
  { label: 'Galaxy S26',            query: 'Galaxy S26',            emoji: '📱', byteCat: 'mobile' },
  { label: 'Pixel 11 Pro',          query: 'Pixel 11 Pro',          emoji: '📱', byteCat: 'mobile' },
  { label: 'Pixel 11',              query: 'Pixel 11',              emoji: '📱', byteCat: 'mobile' },
  { label: 'Foldable phone 2026',   query: 'foldable phone 2026',   emoji: '📱', byteCat: 'mobile' },
  { label: 'Best camera phone',     query: 'best camera phone 2026',emoji: '📷', byteCat: 'mobile' },
  // AI — strongest growth segment
  { label: 'ChatGPT 5',             query: 'ChatGPT 5',             emoji: '🤖', byteCat: 'ai' },
  { label: 'Claude 5',              query: 'Claude 5',              emoji: '🤖', byteCat: 'ai' },
  { label: 'Gemini 3',              query: 'Gemini 3',              emoji: '🤖', byteCat: 'ai' },
  { label: 'Sora 2',                query: 'Sora 2',                emoji: '🤖', byteCat: 'ai' },
  { label: 'Llama 4',               query: 'Llama 4',               emoji: '🤖', byteCat: 'ai' },
  { label: 'AI agents',             query: 'AI agents',             emoji: '🤖', byteCat: 'ai' },
  { label: 'Local LLM',             query: 'local LLM',             emoji: '🤖', byteCat: 'ai' },
  // HARDWARE — GPUs, CPUs, builds
  { label: 'RTX 5090',              query: 'RTX 5090',              emoji: '⚙️', byteCat: 'hardware' },
  { label: 'RTX 5080',              query: 'RTX 5080',              emoji: '⚙️', byteCat: 'hardware' },
  { label: 'RTX 5070',              query: 'RTX 5070',              emoji: '⚙️', byteCat: 'hardware' },
  { label: 'Snapdragon X Elite 2',  query: 'Snapdragon X Elite 2',  emoji: '⚙️', byteCat: 'hardware' },
  { label: 'AMD Threadripper 2026', query: 'AMD Threadripper 2026', emoji: '⚙️', byteCat: 'hardware' },
  { label: 'Best gaming PC build',  query: 'best gaming PC build 2026', emoji: '🖥️', byteCat: 'hardware' },
  // SOFTWARE / Mac
  { label: 'MacBook Pro M5',        query: 'MacBook Pro M5',        emoji: '💻', byteCat: 'hardware' },
  { label: 'iPad Pro M5',           query: 'iPad Pro M5',           emoji: '💻', byteCat: 'hardware' },
  { label: 'Windows 12',            query: 'Windows 12',            emoji: '🪟', byteCat: 'software' },
  { label: 'macOS 17',              query: 'macOS 17',              emoji: '🍎', byteCat: 'software' },
  { label: 'Linux kernel 7',        query: 'Linux kernel 7',        emoji: '🐧', byteCat: 'software' },
  // GAMING
  { label: 'Switch 2',              query: 'Switch 2',              emoji: '🎮', byteCat: 'gaming' },
  { label: 'PS6',                   query: 'PlayStation 6',         emoji: '🎮', byteCat: 'gaming' },
  { label: 'GTA 6',                 query: 'GTA 6',                 emoji: '🎮', byteCat: 'gaming' },
  { label: 'Xbox Next',             query: 'Xbox Next',             emoji: '🎮', byteCat: 'gaming' },
  // EV
  { label: 'Tesla Cybercab',        query: 'Tesla Cybercab',        emoji: '🚗', byteCat: 'ev' },
  { label: 'Tesla Model Y 2026',    query: 'Tesla Model Y 2026',    emoji: '🚗', byteCat: 'ev' },
  { label: 'Rivian R3',             query: 'Rivian R3',             emoji: '🚗', byteCat: 'ev' },
  // SECURITY
  { label: 'Zero-day 2026',         query: 'zero-day 2026',         emoji: '🛡️', byteCat: 'security' },
  { label: 'Best password manager', query: 'best password manager 2026', emoji: '🛡️', byteCat: 'security' },
  // CRYPTO — kept narrow to avoid YMYL drift
  { label: 'Bitcoin ETF news',      query: 'Bitcoin ETF',           emoji: '₿',  byteCat: 'crypto' },
  // SCIENCE / VR
  { label: 'Apple Vision Pro 2',    query: 'Apple Vision Pro 2',    emoji: '🥽', byteCat: 'hardware' },
  // WEB / consumer apps
  { label: 'TikTok ban update',     query: 'TikTok ban',            emoji: '🌐', byteCat: 'web' },
];

// Balanced homepage selection — explicitly NOT phone-dominated. Reflects a
// tech-news magazine that covers everything, not a phone blog:
//   4 mobile, 4 AI, 3 hardware, 2 gaming, 1 EV, 1 software, 1 security, 1 web
const HOMEPAGE_SELECTION: string[] = [
  'iPhone 18 Pro Max',
  'Galaxy S26 Ultra',
  'Pixel 11 Pro',
  'Foldable phone 2026',
  'ChatGPT 5',
  'Claude 5',
  'Gemini 3',
  'Sora 2',
  'RTX 5090',
  'MacBook Pro M5',
  'Best gaming PC build',
  'Switch 2',
  'GTA 6',
  'Tesla Cybercab',
  'Windows 12',
  'Zero-day 2026',
  'TikTok ban update',
];

interface Props {
  /**
   * When set, the strip shows only terms whose byteCat matches.
   * Used on /category/<slug> pages for deeper category-specific coverage.
   * When undefined, the homepage balanced mix is used.
   */
  category?: 'ai' | 'mobile' | 'hardware' | 'gaming' | 'software' | 'security' | 'ev' | 'science' | 'crypto' | 'web';
}

export default function HotSearchTerms({ category }: Props = {}) {
  const items = category
    ? TERMS.filter((t) => t.byteCat === category)
    : TERMS.filter((t) => HOMEPAGE_SELECTION.includes(t.label));

  if (!items.length) return null;

  const label = category ? `Most searched in ${category}` : 'Most searched right now';
  const note = category
    ? `Top ${category} phrases U.S. readers type into Google. Click any to see our coverage.`
    : 'These are the tech phrases U.S. readers type into Google most often. Click any to see our coverage.';

  return (
    <section
      aria-labelledby="hot-searches-h"
      className="mb-9 -mx-4 px-4 py-4 sm:mx-0 sm:rounded-2xl sm:px-5 bg-bg-card/40 border-y sm:border border-white/5"
    >
      <h2
        id="hot-searches-h"
        className="text-[10px] sm:text-xs uppercase tracking-[0.22em] font-semibold text-muted mb-3 flex items-center gap-2"
      >
        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-orange-400 live-dot" />
        {label}
      </h2>

      {/* Horizontal scroll on mobile, wrapped pills on desktop. */}
      <div className="flex sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-thin">
        {items.map((t) => (
          <Link
            key={t.label}
            href={`/search?q=${encodeURIComponent(t.query)}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold whitespace-nowrap shrink-0 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-accent/40 text-white/85 hover:text-white transition"
          >
            {t.emoji && <span aria-hidden="true" className="text-sm">{t.emoji}</span>}
            <span>{t.label}</span>
          </Link>
        ))}
      </div>

      <p className="text-[11px] text-muted mt-3 leading-snug">{note}</p>
    </section>
  );
}
