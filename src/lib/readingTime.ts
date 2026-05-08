export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(date: Date | string, lang: 'en' | 'de' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
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

export function relativeTime(date: Date | string, lang: 'en' | 'de' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
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
