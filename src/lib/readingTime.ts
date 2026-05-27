export function readingTime(text: string | null | undefined): number {
  // Tolerate null/undefined content so a partial snapshot row doesn't crash
  // pre-render (some article-card props expose body that may be empty).
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(date: Date | string | null | undefined, lang: 'en' | 'de' = 'en'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const locale = lang === 'de' ? 'de-DE' : 'en-US';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}

const STR = {
  en: {
    justNow: 'just now',
    minAgo: (n: number) => `${n} min ago`,
    hAgo: (n: number) => `${n}h ago`,
    dayAgo: (n: number) => `${n} day${n === 1 ? '' : 's'} ago`,
  },
  de: {
    justNow: 'gerade eben',
    minAgo: (n: number) => `vor ${n} Min.`,
    hAgo: (n: number) => `vor ${n} Std.`,
    dayAgo: (n: number) => `vor ${n} Tag${n === 1 ? '' : 'en'}`,
  },
};

// Human-friendly view counter: 1234 → "1.2k", 12345 → "12k", 1234567 → "1.2M".
// Falls back to the raw number under 1000. The "🔥" prefix is added at render
// time so we don't bake locale prefs into the formatter.
export function formatViews(n: number): string {
  if (!n || n < 0) return '0';
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  if (n < 1_000_000) return Math.round(n / 1000) + 'k';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

export function relativeTime(date: Date | string | null | undefined, lang: 'en' | 'de' = 'en'): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  const s = STR[lang];
  if (min < 1) return s.justNow;
  if (min < 60) return s.minAgo(min);
  const h = Math.round(min / 60);
  if (h < 24) return s.hAgo(h);
  const days = Math.round(h / 24);
  if (days < 7) return s.dayAgo(days);
  return formatDate(d, lang);
}
