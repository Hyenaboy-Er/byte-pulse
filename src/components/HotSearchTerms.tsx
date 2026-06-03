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
  cat?: 'phone' | 'gpu' | 'ai' | 'mac' | 'console' | 'ev' | 'vr';
}

// Ordered by US-search volume (rough). Phones at the front because they're
// the highest-CPC AdSense category we want to dominate.
const TERMS: Term[] = [
  { label: 'iPhone 18 Pro Max',  query: 'iPhone 18 Pro Max',  emoji: '📱', cat: 'phone' },
  { label: 'iPhone 18 Pro',      query: 'iPhone 18 Pro',      emoji: '📱', cat: 'phone' },
  { label: 'Galaxy S26 Ultra',   query: 'Galaxy S26 Ultra',   emoji: '📱', cat: 'phone' },
  { label: 'Pixel 11 Pro',       query: 'Pixel 11 Pro',       emoji: '📱', cat: 'phone' },
  { label: 'RTX 5090',           query: 'RTX 5090',           emoji: '⚙️', cat: 'gpu' },
  { label: 'RTX 5080',           query: 'RTX 5080',           emoji: '⚙️', cat: 'gpu' },
  { label: 'MacBook Pro M5',     query: 'MacBook Pro M5',     emoji: '💻', cat: 'mac' },
  { label: 'iPad Pro M5',        query: 'iPad Pro M5',        emoji: '💻', cat: 'mac' },
  { label: 'ChatGPT 5',          query: 'ChatGPT 5',          emoji: '🤖', cat: 'ai' },
  { label: 'Claude 5',           query: 'Claude 5',           emoji: '🤖', cat: 'ai' },
  { label: 'Gemini 3',           query: 'Gemini 3',           emoji: '🤖', cat: 'ai' },
  { label: 'Sora 2',             query: 'Sora 2',             emoji: '🤖', cat: 'ai' },
  { label: 'Switch 2',           query: 'Switch 2',           emoji: '🎮', cat: 'console' },
  { label: 'PS6',                query: 'PlayStation 6',      emoji: '🎮', cat: 'console' },
  { label: 'Apple Vision Pro 2', query: 'Apple Vision Pro 2', emoji: '🥽', cat: 'vr' },
  { label: 'Tesla Cybercab',     query: 'Tesla Cybercab',     emoji: '🚗', cat: 'ev' },
  { label: 'Tesla Model Y 2026', query: 'Tesla Model Y 2026', emoji: '🚗', cat: 'ev' },
];

export default function HotSearchTerms() {
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
        Most searched right now
      </h2>

      {/* Horizontal scroll on mobile, wrapped pills on desktop. */}
      <div className="flex sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-thin">
        {TERMS.map((t) => (
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

      <p className="text-[11px] text-muted mt-3 leading-snug">
        These are the tech phrases U.S. readers type into Google most often.
        Click any to see our coverage.
      </p>
    </section>
  );
}
