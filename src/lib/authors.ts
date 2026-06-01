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

// Founder's verified personal LinkedIn — the single strongest E-E-A-T
// signal for a one-founder publication. Set via env SITE_FOUNDER_LINKEDIN
// to make corrections trivial. Default points at his public slug.
export const FOUNDER_LINKEDIN = process.env.SITE_FOUNDER_LINKEDIN
  ?? 'https://www.linkedin.com/in/serhat-er';

export const AUTHORS: Author[] = [
  {
    // Merged identity: the founder is also the editor-in-chief. No more
    // "Serhat Kalender" pseudonym — Google penalises ambiguous identity
    // and the user prefers ONE verifiable byline. Old /author/serhat-kalender
    // is kept as an alias by getAuthor() below so any indexed URLs still
    // resolve.
    slug: 'serhat-er',
    name: SITE.founderName,
    role: 'Founder & Editor-in-Chief',
    bioEn: `${SITE.founderName} founded ${BRAND} to cover European tech that US blogs miss. He owns the editorial direction, reviews every AI and security story personally, signs off on each article before publish, and writes the in-depth buying guides and head-to-head comparisons. Based in Leverkusen, Germany. Reach out at editorial@byte-pulse.net.`,
    bioDe: `${SITE.founderName} hat ${BRAND} gegründet, um europäische Tech-Themen abzudecken, die US-Blogs übersehen. Er verantwortet die redaktionelle Linie, prüft persönlich alle KI- und Security-Stories, gibt jeden Artikel vor Veröffentlichung frei und schreibt die Kaufberatungen und Direktvergleiche. Basiert in Leverkusen, Deutschland. Kontakt: editorial@byte-pulse.net.`,
    expertise: ['AI', 'Security', 'European tech policy', 'Buying guides', 'Hardware comparisons', 'Consumer tech'],
    sameAs: [FOUNDER_LINKEDIN, BRAND_X, BRAND_MASTODON, BRAND_BLUESKY, BRAND_SITE],
  },
  {
    slug: 'byte-pulse-newsroom',
    name: `${BRAND} Newsroom`,
    role: 'Editorial Team',
    bioEn: `The ${BRAND} newsroom covers hardware, gaming and mobile launches in real time. Every story goes through a multi-step fact-checking pipeline — sourcing, factuality scoring, and editor review by ${SITE.founderName} — before it's published. Tips: editorial@byte-pulse.net.`,
    bioDe: `Das ${BRAND}-Newsroom-Team berichtet in Echtzeit über Hardware-, Gaming- und Mobile-Launches. Jede Story durchläuft eine mehrstufige Faktenprüfung — Quellen-Check, Faktentreue-Bewertung und Editor-Review durch ${SITE.founderName} — bevor sie veröffentlicht wird. Hinweise: editorial@byte-pulse.net.`,
    expertise: ['Hardware', 'Gaming', 'Mobile'],
    sameAs: [BRAND_X, BRAND_MASTODON, BRAND_BLUESKY, BRAND_YOUTUBE, BRAND_TIKTOK, BRAND_SITE],
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

// Legacy slug aliases — old /author/serhat-kalender URLs (Google may have
// indexed them) redirect to the merged founder profile via the same lookup.
const SLUG_ALIASES: Record<string, string> = {
  'serhat-kalender': 'serhat-er',
};

const AUTHOR_BY_SLUG: Record<string, Author> = Object.fromEntries(AUTHORS.map((a) => [a.slug, a]));

// Map article categories to the most plausible author. Founder gets the
// expert categories (AI/security/science + buying guides); Newsroom takes
// hardware/gaming/mobile/ev; Software lead handles software/web/crypto.
const CATEGORY_TO_AUTHOR: Record<string, string> = {
  ai: 'serhat-er',
  security: 'serhat-er',
  science: 'serhat-er',
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
    return AUTHOR_BY_SLUG['serhat-er'] ?? AUTHORS[0];
  }
  const wanted = CATEGORY_TO_AUTHOR[category] ?? 'byte-pulse-newsroom';
  return AUTHOR_BY_SLUG[wanted] ?? AUTHORS[0];
}

export function getAuthor(slug: string): Author | null {
  const resolved = SLUG_ALIASES[slug] ?? slug;
  return AUTHOR_BY_SLUG[resolved] ?? null;
}

/**
 * Canonical slug for an author — follows aliases. Used by article pages
 * and JSON-LD to avoid emitting a /author URL Google would treat as 404.
 */
export function canonicalAuthorSlug(slug: string): string {
  return SLUG_ALIASES[slug] ?? slug;
}
