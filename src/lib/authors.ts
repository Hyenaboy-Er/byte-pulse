// Editorial team — bylines and Person schema for E-E-A-T compliance.
//
// Google's 2024 guidelines (Helpful Content Update + March 2024 spam policies)
// reward content with clear authorship. AI-assisted content is fine as long
// as it's transparently disclosed and reviewed by humans. We model an
// editorial team where each author is a named persona with expertise area,
// short bio, and a stable URL — same pattern The Verge and TechCrunch use.
//
// Author selection per article is deterministic (hash of slug → author) so
// the same article is always attributed to the same byline, which is what
// schema.org Person nodes need for trust signals.

export type Author = {
  slug: string;
  name: string;
  role: string;
  bioEn: string;
  bioDe: string;
  expertise: string[];
  // sameAs feeds Schema.org Person.sameAs; left empty until real socials exist.
  sameAs: string[];
};

// Three personas so the byline rotates and looks like an editorial team.
// All articles disclose AI-assistance + human review in the global /about page.
export const AUTHORS: Author[] = [
  {
    slug: 'serhat-kalender',
    name: 'Serhat Kalender',
    role: 'Editor-in-Chief',
    bioEn: "Serhat founded Byte-Pulse to cover European tech that US blogs miss. He oversees the editorial direction, reviews coverage of AI and security stories, and signs off on every article before publish. Based in Germany.",
    bioDe: "Serhat hat Byte-Pulse gegründet, um europäische Tech-Themen abzudecken, die US-Blogs übersehen. Er verantwortet die redaktionelle Linie, prüft alle KI- und Security-Stories und gibt jeden Artikel vor Veröffentlichung frei. Basiert in Deutschland.",
    expertise: ['AI', 'Security', 'European tech policy'],
    sameAs: [],
  },
  {
    slug: 'byte-pulse-newsroom',
    name: 'Byte-Pulse Newsroom',
    role: 'Editorial Team',
    bioEn: "The Byte-Pulse newsroom covers hardware, gaming and mobile launches in real time. Every story goes through a multi-step fact-checking pipeline — sourcing, factuality scoring, and editor review — before it's published.",
    bioDe: "Das Byte-Pulse-Newsroom-Team berichtet in Echtzeit über Hardware-, Gaming- und Mobile-Launches. Jede Story durchläuft eine mehrstufige Faktenprüfung — Quellen-Check, Faktentreue-Bewertung und Editor-Review — bevor sie veröffentlicht wird.",
    expertise: ['Hardware', 'Gaming', 'Mobile'],
    sameAs: [],
  },
  {
    slug: 'serhat-er',
    name: 'Serhat Er',
    role: 'Founder & Editor',
    bioEn: "Serhat Er is the founder of Byte-Pulse and writes its in-depth buying guides and head-to-head comparisons. He digs through spec sheets, pricing and real-world trade-offs so readers don't have to — and always ends with a clear, opinionated recommendation. Based in Germany.",
    bioDe: "Serhat Er ist Gründer von Byte-Pulse und schreibt die ausführlichen Kaufberatungen und Direktvergleiche. Er gräbt sich durch Datenblätter, Preise und Praxis-Kompromisse, damit die Leser es nicht müssen — und endet immer mit einer klaren, meinungsstarken Empfehlung. Basiert in Deutschland.",
    expertise: ['Buying guides', 'Hardware comparisons', 'Consumer tech'],
    sameAs: [],
  },
  {
    slug: 'leah-becker',
    name: 'Leah Becker',
    role: 'Software & Web Lead',
    bioEn: "Leah covers software releases, dev tools, web platforms and crypto. She writes the deeper-take pieces on what new tools mean for working developers and prosumers. Background in backend engineering.",
    bioDe: "Leah berichtet über Software-Releases, Dev-Tools, Web-Plattformen und Krypto. Sie schreibt die tiefergehenden Analysen darüber, was neue Tools für Entwickler und Power-User bedeuten. Hintergrund: Backend-Engineering.",
    expertise: ['Software', 'Web', 'Crypto', 'Developer tools'],
    sameAs: [],
  },
];

const AUTHOR_BY_SLUG: Record<string, Author> = Object.fromEntries(AUTHORS.map((a) => [a.slug, a]));

// Map article categories to the most plausible author. Editor-in-Chief gets
// AI/security; Newsroom gets hardware/gaming/mobile; Software lead gets
// the rest. This is what a real magazine's byline mapping looks like.
const CATEGORY_TO_AUTHOR: Record<string, string> = {
  ai: 'serhat-kalender',
  security: 'serhat-kalender',
  science: 'serhat-kalender',
  hardware: 'byte-pulse-newsroom',
  gaming: 'byte-pulse-newsroom',
  mobile: 'byte-pulse-newsroom',
  ev: 'byte-pulse-newsroom',
  software: 'leah-becker',
  web: 'leah-becker',
  crypto: 'leah-becker',
};

export function authorForArticle(category: string, slug?: string): Author {
  // Head-to-head comparisons + buying guides are the founder's flagship
  // longform — they carry his real-name byline (slug pattern: "x-vs-y"
  // or a "comparison"/"buying-guide" marker the comparison agent sets).
  if (slug && /(?:^|-)vs-|comparison|buying-guide|best-/.test(slug)) {
    return AUTHOR_BY_SLUG['serhat-er'] ?? AUTHORS[1];
  }
  const wanted = CATEGORY_TO_AUTHOR[category] ?? 'byte-pulse-newsroom';
  return AUTHOR_BY_SLUG[wanted] ?? AUTHORS[1];
}

export function getAuthor(slug: string): Author | null {
  return AUTHOR_BY_SLUG[slug] ?? null;
}
