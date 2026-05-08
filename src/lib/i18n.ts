// Tiny i18n for the German UI shell. Article CONTENT is translated by the
// Translator agent (cached in DB). This file only handles UI chrome.

export type Lang = 'en' | 'de';

export const T = {
  en: {
    live: 'LIVE',
    newsletter: 'Newsletter',
    sections: 'Sections',
    more: 'More',
    rss: 'RSS',
    about: 'About',
    privacy: 'Privacy',
    search: 'Search',
    home: 'Home',
    minRead: 'min read',
    minReadShort: 'min',
    source: 'Source',
    quality: 'Quality',
    moreFrom: 'More from',
    latest: 'Latest',
    trending: 'Trending',
    newsletterPitch: 'Top tech stories every weekday at 7:00 AM. Free.',
    nothingYet: 'No articles in this section yet. The bots are on it.',
    searchPlaceholder: 'What are you looking for? e.g. iPhone, Sora, RTX 5090…',
    searchTip: 'Tip: try product names, people, companies, or tags.',
    searchResults: (n: number, q: string) => `${n} result${n === 1 ? '' : 's'} for "${q}"`,
    searchEmpty: (q: string) => `Nothing for "${q}" yet. Maybe tomorrow.`,
    subscribe: 'Subscribe',
    onTheList: "You're on the list.",
    invalidEmail: 'Please enter a valid email.',
    networkError: 'Network error.',
  },
  de: {
    live: 'LIVE',
    newsletter: 'Newsletter',
    sections: 'Rubriken',
    more: 'Mehr',
    rss: 'RSS',
    about: 'Über uns',
    privacy: 'Datenschutz',
    search: 'Suche',
    home: 'Startseite',
    minRead: 'Min. Lesezeit',
    minReadShort: 'Min.',
    source: 'Quelle',
    quality: 'Qualität',
    moreFrom: 'Mehr aus',
    latest: 'Aktuell',
    trending: 'Trending',
    newsletterPitch: 'Die wichtigsten Tech-Storys jeden Werktag um 7:00 Uhr. Kostenlos.',
    nothingYet: 'Noch keine Artikel in dieser Rubrik. Die Bots arbeiten dran.',
    searchPlaceholder: 'Wonach suchst du? z.B. iPhone, Sora, RTX 5090…',
    searchTip: 'Tipp: nach Produkten, Personen, Firmen oder Tags suchen.',
    searchResults: (n: number, q: string) => `${n} Treffer für „${q}"`,
    searchEmpty: (q: string) => `Nichts gefunden für „${q}". Vielleicht morgen.`,
    subscribe: 'Abonnieren',
    onTheList: 'Geschafft! Du bist auf der Liste.',
    invalidEmail: 'Bitte gültige E-Mail eingeben.',
    networkError: 'Netzwerkfehler.',
  },
} as const;

export function t(lang: Lang) {
  return T[lang];
}
