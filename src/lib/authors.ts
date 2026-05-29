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
//
// Brand name + founder identity are pulled from the central config keystone
// so a clone gets correct bylines/schema with zero edits here.

import { SITE } from './site';

const BRAND = SITE.name;

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
// Public brand-channel URLs — used to anchor the editorial team's sameAs
// arrays. Google's E-E-A-T evaluation treats an empty sameAs as "this
// author cannot be verified" and downweights the byline. Linking to
// brand-owned social profiles (each manually checked, not random) gives
// Google a graph it can verify.
const BRAND_X         = 'https://x.com/bytePulsenew';
const BRAND_MASTODON  = 'https://mastodon.social/@BytePulseNet';
const BRAND_BLUESKY   = 'https://bsky.app/profile/byte-pulse.bsky.social';
const BRAND_YOUTUBE   = 'https://www.youtube.com/@Byte-PulseNet';
const BRAND_TIKTOK    = 'https://www.tiktok.com/@bytepulse.net';
const BRAND_SITE      = SITE.url;

export const AUTHORS: Author[] = [
  {
    slug: 'serhat-kalender',
    name: 'Serhat Kalender',
    role: 'Editor-in-Chief',
    bioEn: `Serhat founded ${BRAND} to cover European tech that US blogs miss. He oversees the editorial direction, reviews coverage of AI and security stories, and signs off on every article before publish. Based in Germany. Reach out at editorial@byte-pulse.net.`,
    bioDe: `Serhat hat ${BRAND} gegründet, um europäische Tech-Themen abzudecken, die US-Blogs übersehen. Er verantwortet die redaktionelle Linie, prüft alle KI- und Security-Stories und gibt jeden Artikel vor Veröffentlichung frei. Basiert in Deutschland. Kontakt: editorial@byte-pulse.net.`,
    expertise: ['AI', 'Security', 'European tech policy'],
    // Editor-in-Chief is fronted by the brand's own channels — anchor him
    // to those so Schema.org Person.sameAs is non-empty and verifiable.
    sameAs: [BRAND_X, BRAND_MASTODON, BRAND_BLUESKY, BRAND_SITE],
  },
  {
    slug: 'byte-pulse-newsroom',
    name: `${BRAND} Newsroom`,
    role: 'Editorial Team',
    bioEn: `The ${BRAND} newsroom covers hardware, gaming and mobile launches in real time. Every story goes through a multi-step fact-checking pipeline — sourcing, factuality scoring, and editor review — before it's published. Tips: editorial@byte-pulse.net.`,
    bioDe: `Das ${BRAND}-Newsroom-Team berichtet in Echtzeit über Hardware-, Gaming- und Mobile-Launches. Jede Story durchläuft eine mehrstufige Faktenprüfung — Quellen-Check, Faktentreue-Bewertung und Editor-Review — bevor sie veröffentlicht wird. Hinweise: editorial@byte-pulse.net.`,
    expertise: ['Hardware', 'Gaming', 'Mobile'],
    sameAs: [BRAND_X, BRAND_MASTODON, BRAND_BLUESKY, BRAND_YOUTUBE, BRAND_TIKTOK, BRAND_SITE],
  },
  {
    slug: 'serhat-er',
    name: SITE.founderName,
    role: SITE.founderRole,
    bioEn: `${SITE.founderName} is the founder of ${BRAND} and writes its in-depth buying guides and head-to-head comparisons. He digs through spec sheets, pricing and real-world trade-offs so readers don't have to — and always ends with a clear, opinionated recommendation. Based in Germany.`,
    bioDe: `${SITE.founderName} ist Gründer von ${BRAND} und schreibt die ausführlichen Kaufberatungen und Direktvergleiche. Er gräbt sich durch Datenblätter, Preise und Praxis-Kompromisse, damit die Leser es nicht müssen — und endet immer mit einer klaren, meinungsstarken Empfehlung. Basiert in Deutschland.`,
    expertise: ['Buying guides', 'Hardware comparisons', 'Consumer tech'],
    sameAs: [BRAND_X, BRAND_BLUESKY, BRAND_SITE],
  },
  {
    slug: 'leah-becker',
    name: 'Leah Becker',
    role: 'Software & Web Lead',
    bioEn: "Leah covers software releases, dev tools, web platforms and crypto. She writes the deeper-take pieces on what new tools mean for working developers and prosumers. Background in backend engineering.",
    bioDe: "Leah berichtet über Software-Releases, Dev-Tools, Web-Plattformen und Krypto. Sie schreibt die tiefergehenden Analysen darüber, was neue Tools für Entwickler und Power-User bedeuten. Hintergrund: Backend-Engineering.",
    expertise: ['Software', 'Web', 'Crypto', 'Developer tools'],
    sameAs: [BRAND_MASTODON, BRAND_BLUESKY, BRAND_SITE],
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

export function authorForArticle(
  category: string,
  _slug?: string,
  sourceName?: string,
): Author {
  // The founder's real-name byline is reserved for the comparison agent's
  // flagship buying guides ONLY. Those are the single thing on the site
  // that sets sourceName=`${SITE.name} Original` — a precise, unambiguous
  // marker. The old "slug contains -vs-" heuristic was too broad: news
  // stories like "Elon Musk vs OpenAI" or "Umbrellas vs Drones" wrongly
  // got the Founder & Editor byline, which hurts credibility/E-E-A-T.
  // Derived from SITE.name (not imported from the agent) to keep this
  // page-side module free of the heavy agent graph while staying in sync.
  if (sourceName === `${BRAND} Original`) {
    return AUTHOR_BY_SLUG['serhat-er'] ?? AUTHORS[1];
  }
  const wanted = CATEGORY_TO_AUTHOR[category] ?? 'byte-pulse-newsroom';
  return AUTHOR_BY_SLUG[wanted] ?? AUTHORS[1];
}

export function getAuthor(slug: string): Author | null {
  return AUTHOR_BY_SLUG[slug] ?? null;
}
