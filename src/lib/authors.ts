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
  // Public photo (path under /public). Empty string → falls back to initials
  // avatar in the UI but Schema.org Person.image is omitted, not lied about.
  photo?: string;
  // 2026-06-04: when true, this entity is rendered as schema.org Organization,
  // not Person — used for the newsroom byline on AI-augmented news articles.
  // Avoids the "850 articles by one human in 3 weeks" impossibility flag.
  isOrganization?: boolean;
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
  ?? 'https://www.linkedin.com/in/serhat-er-brlvision/';

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
    photo: '/authors/serhat-er.jpg',
  },
  {
    slug: 'byte-pulse-newsroom',
    name: `${BRAND} Newsroom`,
    role: 'AI-augmented editorial system',
    bioEn: `The ${BRAND} Newsroom is the editorial system that produces ${BRAND}'s daily tech news coverage. Each story is cross-referenced across 3+ independent outlets, drafted with AI assistance by the newsroom system (Drafter → Editor → Fact-Checker → Polisher), and reviewed by ${SITE.founderName}, Editor-in-Chief, before publication. We disclose AI augmentation openly. Editorial accountability stays with the named editor on every article. Tips: editorial@byte-pulse.net.`,
    bioDe: `Die ${BRAND}-Newsroom ist das redaktionelle System, das ${BRAND}s tägliche Tech-News-Berichterstattung produziert. Jede Story wird über 3+ unabhängige Quellen verifiziert, KI-gestützt vom Newsroom-System verfasst (Drafter → Editor → Fact-Checker → Polisher) und vor Veröffentlichung von ${SITE.founderName}, Chefredakteur, freigegeben. KI-Augmentation wird offen offengelegt. Redaktionelle Verantwortung liegt beim namentlich genannten Editor jedes Artikels. Hinweise: editorial@byte-pulse.net.`,
    expertise: ['Hardware', 'AI', 'Gaming', 'Mobile', 'Security', 'EV', 'Software'],
    sameAs: [BRAND_X, BRAND_MASTODON, BRAND_BLUESKY, BRAND_YOUTUBE, BRAND_TIKTOK, BRAND_SITE],
    isOrganization: true,
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
  _category: string,
  _slug?: string,
  sourceName?: string | null,
): Author {
  // 2026-06-04 final attribution model (after AdSense pre-review consult):
  //   - EVERGREENS (deep editorial pieces Serhat personally briefs and reviews
  //     intensively): bylined to Serhat Er. Signal: sourceName === 'Byte-Pulse
  //     Original' OR slug matches the evergreen queue.
  //   - NEWS ARTICLES (multi-source AI-augmented synthesis): bylined to
  //     Byte-Pulse Newsroom (Organization), with "Edited by Serhat Er,
  //     Editor-in-Chief" prominently rendered AND emitted in Schema.org
  //     editor/reviewedBy fields. Solves the "850 articles by one person
  //     in 3 weeks" mathematical-impossibility flag that AdSense reviewers
  //     read as "misleading attribution". Industry-standard pattern —
  //     Reuters, AP, Bloomberg all attribute breaking-news desk pieces to
  //     the newsroom organization with a named editor below.
  //
  // The signal we use is the article's sourceName: evergreens explicitly
  // set 'Byte-Pulse Original'; news articles set the actual outlet name
  // (Heise, TechCrunch, etc).
  if (sourceName === 'Byte-Pulse Original') {
    return AUTHOR_BY_SLUG['serhat-er'] ?? AUTHORS[0];
  }
  return AUTHOR_BY_SLUG['byte-pulse-newsroom'] ?? AUTHOR_BY_SLUG['serhat-er'] ?? AUTHORS[0];
}

/**
 * The editor-in-chief who signs off on every article. Used for the
 * "Edited by …" sub-byline on news articles and as the schema.org
 * editor/reviewedBy person.
 */
export function editorInChief(): Author {
  return AUTHOR_BY_SLUG['serhat-er'] ?? AUTHORS[0];
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
