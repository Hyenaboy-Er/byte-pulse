// Affiliate-link helpers. All affiliate IDs read from env so the code stays
// safe to commit. If an env var is missing, the helper returns null and the
// caller falls back to plain text — no broken links.

// Multi-region Amazon tags. We have separate Associate IDs per Amazon region:
//   - DE (.de) → bytepulse-21 in EU PartnerNet
//   - US (.com) → bytepulse01-20 in US Associates
//   - UK/FR/ES/IT also covered by EU PartnerNet (same EU account, separate tag per region — fill in once IDs arrive by email).
// Hardcoded defaults so revenue links always render. Vercel env vars take
// precedence when present — replace these once the actual PartnerNet IDs are
// confirmed (planned: bytepulse-21 for DE PartnerNet, bytepulse01-20 for US
// Associates). Until confirmed, links still drive clicks, attribution kicks in
// retroactively once the right tag is plugged in via Vercel env.
const AMAZON_TAG_DE_DEFAULT = 'bytepulse-21';
const AMAZON_TAG_US_DEFAULT = 'bytepulse01-20';
const AMAZON_TAGS = {
  en: process.env.AMAZON_ASSOCIATE_TAG_US ?? process.env.AMAZON_ASSOCIATE_TAG ?? AMAZON_TAG_US_DEFAULT,
  de: process.env.AMAZON_ASSOCIATE_TAG_DE ?? process.env.AMAZON_ASSOCIATE_TAG ?? AMAZON_TAG_DE_DEFAULT,
} as const;
const SKIMLINKS_ID = process.env.NEXT_PUBLIC_SKIMLINKS_ID; // for the loader script
const NORDVPN_REF = process.env.NORDVPN_AFFILIATE_REF; // Awin link or NordVPN partner code
const SURFSHARK_REF = process.env.SURFSHARK_AFFILIATE_REF;
const HOSTINGER_REF = process.env.HOSTINGER_AFFILIATE_REF;
const PROTONVPN_REF = process.env.PROTONVPN_AFFILIATE_REF;

// Amazon TLD per locale. EN articles → amazon.com (US), DE articles → amazon.de.
const AMAZON_HOSTS = { en: 'amazon.com', de: 'amazon.de' } as const;
type Lang = keyof typeof AMAZON_HOSTS;

// Catalogue of products we want the writer to auto-link when it sees them in
// the article body. The match is case-insensitive whole-word; ordering matters
// (longer phrases first to avoid "iPhone 17 Pro" being shadowed by "iPhone 17").
export const PRODUCT_KEYWORDS: { match: RegExp; query: string; cat: 'mobile' | 'hardware' | 'gaming' | 'web' | 'software' | 'mobile-accessory' }[] = [
  // Phones / wearables
  { match: /\biPhone\s*17\s*Pro\s*Max\b/gi, query: 'iPhone 17 Pro Max', cat: 'mobile' },
  { match: /\biPhone\s*17\s*Pro\b/gi, query: 'iPhone 17 Pro', cat: 'mobile' },
  { match: /\biPhone\s*17\b/gi, query: 'iPhone 17', cat: 'mobile' },
  { match: /\biPhone\s*16\s*Pro\b/gi, query: 'iPhone 16 Pro', cat: 'mobile' },
  { match: /\biPhone\s*16\b/gi, query: 'iPhone 16', cat: 'mobile' },
  { match: /\bGalaxy\s*S26\s*Ultra\b/gi, query: 'Samsung Galaxy S26 Ultra', cat: 'mobile' },
  { match: /\bGalaxy\s*S26\b/gi, query: 'Samsung Galaxy S26', cat: 'mobile' },
  { match: /\bGalaxy\s*S25\s*Ultra\b/gi, query: 'Samsung Galaxy S25 Ultra', cat: 'mobile' },
  { match: /\bGalaxy\s*S25\b/gi, query: 'Samsung Galaxy S25', cat: 'mobile' },
  { match: /\bPixel\s*10\s*Pro\b/gi, query: 'Google Pixel 10 Pro', cat: 'mobile' },
  { match: /\bPixel\s*10\b/gi, query: 'Google Pixel 10', cat: 'mobile' },
  { match: /\bAirPods\s*Pro\s*3\b/gi, query: 'AirPods Pro 3', cat: 'mobile-accessory' },
  { match: /\bAirPods\s*Pro\s*2\b/gi, query: 'AirPods Pro 2', cat: 'mobile-accessory' },
  { match: /\bAirPods\s*Max\b/gi, query: 'AirPods Max', cat: 'mobile-accessory' },
  { match: /\bApple\s*Watch\s*Ultra\s*3\b/gi, query: 'Apple Watch Ultra 3', cat: 'mobile-accessory' },
  { match: /\bApple\s*Watch\s*Series\s*11\b/gi, query: 'Apple Watch Series 11', cat: 'mobile-accessory' },
  // Laptops
  { match: /\bMacBook\s*Air\s*M5\b/gi, query: 'MacBook Air M5', cat: 'hardware' },
  { match: /\bMacBook\s*Air\s*M4\b/gi, query: 'MacBook Air M4', cat: 'hardware' },
  { match: /\bMacBook\s*Pro\s*M5\b/gi, query: 'MacBook Pro M5', cat: 'hardware' },
  { match: /\bMacBook\s*Pro\s*M4\b/gi, query: 'MacBook Pro M4', cat: 'hardware' },
  // Consoles
  { match: /\bPlayStation\s*6\b/gi, query: 'PlayStation 6', cat: 'gaming' },
  { match: /\bPlayStation\s*5\s*Pro\b/gi, query: 'PlayStation 5 Pro', cat: 'gaming' },
  { match: /\bPlayStation\s*5\b/gi, query: 'PlayStation 5', cat: 'gaming' },
  { match: /\bPS5\s*Pro\b/gi, query: 'PS5 Pro', cat: 'gaming' },
  { match: /\bPS5\b/gi, query: 'PS5', cat: 'gaming' },
  { match: /\bNintendo\s*Switch\s*2\b/gi, query: 'Nintendo Switch 2', cat: 'gaming' },
  { match: /\bSteam\s*Deck\s*OLED\b/gi, query: 'Steam Deck OLED', cat: 'gaming' },
  // GPUs
  { match: /\bRTX\s*5090\b/gi, query: 'GeForce RTX 5090', cat: 'hardware' },
  { match: /\bRTX\s*5080\b/gi, query: 'GeForce RTX 5080', cat: 'hardware' },
  { match: /\bRTX\s*4090\b/gi, query: 'GeForce RTX 4090', cat: 'hardware' },
];

export function amazonSearchUrl(query: string, lang: Lang = 'en'): string | null {
  const tag = AMAZON_TAGS[lang];
  if (!tag) return null;
  const host = AMAZON_HOSTS[lang];
  const q = encodeURIComponent(query);
  return `https://www.${host}/s?k=${q}&tag=${tag}`;
}

// Inject Amazon affiliate links into article markdown ONCE per product mention.
// We replace only the FIRST occurrence of each match — multiple links to the same
// product page look spammy and tank UX. Skips replacements that already sit
// inside an existing markdown link [text](url).
export function injectAmazonLinks(markdown: string, lang: Lang = 'en'): { content: string; injected: number } {
  if (!AMAZON_TAGS[lang]) return { content: markdown, injected: 0 };

  let content = markdown;
  let injected = 0;
  // Build a quick index of regions already inside [..](..) so we don't double-link.
  const linkRanges: [number, number][] = [];
  for (const m of content.matchAll(/\[[^\]]*\]\([^)]*\)/g)) {
    if (m.index !== undefined) linkRanges.push([m.index, m.index + m[0].length]);
  }
  const inLink = (idx: number) => linkRanges.some(([a, b]) => idx >= a && idx < b);

  for (const { match, query } of PRODUCT_KEYWORDS) {
    let didReplace = false;
    content = content.replace(match, (hit, offset: number) => {
      if (didReplace) return hit;
      if (typeof offset === 'number' && inLink(offset)) return hit;
      const url = amazonSearchUrl(query, lang);
      if (!url) return hit;
      didReplace = true;
      injected++;
      return `[${hit}](${url})`;
    });
  }
  return { content, injected };
}

// Affiliate CTAs — one per article when relevant. The orchestrator picks the
// best CTA based on category, the writer doesn't have to think about it.
export type AffiliateCTA = {
  kind: 'nordvpn' | 'surfshark' | 'protonvpn' | 'hostinger';
  ref: string;
  title: string;
  body: string;
  cta: string;
};

export function affiliateCtaFor(category: string, lang: Lang = 'en'): AffiliateCTA | null {
  // Security / privacy stories → VPN
  if (category === 'security') {
    if (NORDVPN_REF) return {
      kind: 'nordvpn',
      ref: NORDVPN_REF,
      title: lang === 'de' ? 'Schütze dich beim Surfen' : 'Stay private online',
      body: lang === 'de'
        ? 'NordVPN verschlüsselt deinen Traffic und blockt Tracker — gerade nach Daten-Leaks wie diesem ein guter Reflex.'
        : 'NordVPN encrypts your traffic and blocks trackers — a sensible default after stories like this.',
      cta: lang === 'de' ? 'NordVPN ansehen' : 'Get NordVPN',
    };
    if (SURFSHARK_REF) return {
      kind: 'surfshark',
      ref: SURFSHARK_REF,
      title: lang === 'de' ? 'Privatsphäre wiederherstellen' : 'Reclaim your privacy',
      body: lang === 'de'
        ? 'Surfshark VPN für unbegrenzte Geräte zum kleinen Preis.'
        : 'Surfshark VPN for unlimited devices at a low price.',
      cta: lang === 'de' ? 'Surfshark testen' : 'Try Surfshark',
    };
    if (PROTONVPN_REF) return {
      kind: 'protonvpn',
      ref: PROTONVPN_REF,
      title: lang === 'de' ? 'Open-Source VPN aus der Schweiz' : 'Open-source VPN from Switzerland',
      body: lang === 'de'
        ? 'Proton VPN — von Wissenschaftlern aus dem CERN, mit kostenloser Stufe.'
        : 'Proton VPN — built by CERN scientists, with a real free tier.',
      cta: lang === 'de' ? 'Proton VPN' : 'Get Proton VPN',
    };
  }
  // Software / web-app / dev stories → hosting
  if ((category === 'software' || category === 'web') && HOSTINGER_REF) {
    return {
      kind: 'hostinger',
      ref: HOSTINGER_REF,
      title: lang === 'de' ? 'Eigene Website hosten?' : 'Host your own site?',
      body: lang === 'de'
        ? 'Hostinger ab 2,99 €/Monat — perfekt für eigene Projekte.'
        : 'Hostinger from $2.99/month — solid for side projects.',
      cta: lang === 'de' ? 'Hostinger ansehen' : 'See Hostinger',
    };
  }
  return null;
}
