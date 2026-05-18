// ─────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for everything site-specific.
//
// Why this exists: byte-pulse.net was hardwired across ~42 files. To spin
// up site #2, #3 … you must NOT hunt through the codebase. Everything that
// changes per-site lives here, env-driven, with byte-pulse values as the
// fallback so the live site keeps working unchanged while new code migrates
// to read from SITE.* incrementally.
//
// New site = set the env vars below in Vercel (+ the per-domain external
// setup in docs/NEW-SITE-LAUNCH.md). Zero code edits for a clone.
// ─────────────────────────────────────────────────────────────────────────

const env = (k: string, fallback: string): string =>
  (process.env[k] && String(process.env[k]).trim()) || fallback;

export const SITE = {
  // Identity
  name: env('NEXT_PUBLIC_SITE_NAME', 'Byte-Pulse'),
  url: env('NEXT_PUBLIC_SITE_URL', 'https://www.byte-pulse.net').replace(/\/$/, ''),
  apexDomain: env('SITE_APEX_DOMAIN', 'byte-pulse.net'),
  tagline: env('NEXT_PUBLIC_SITE_TAGLINE', 'Tech news that matters'),
  email: env('NEXT_PUBLIC_SITE_EMAIL', 'editorial@byte-pulse.net'),
  // Newsletter sender + cadence
  newsletterFrom: env('NEWSLETTER_FROM', 'Byte-Pulse <editorial@byte-pulse.net>'),
  newsletterBrand: env('NEWSLETTER_BRAND', 'The Byte-Pulse Brief'),
  // Founder / flagship-longform byline (comparison agent)
  founderName: env('SITE_FOUNDER_NAME', 'Serhat Er'),
  founderRole: env('SITE_FOUNDER_ROLE', 'Founder & Editor'),
  // External integration IDs (per-domain — looked up once at launch)
  mastodonAccountId: env('MASTODON_ACCOUNT_ID', '116561836232583594'),
  mastodonInstance: env('MASTODON_INSTANCE', 'mastodon.social'),
  resendDomainId: env('RESEND_DOMAIN_ID', ''),
  cloudflareZoneId: env('CLOUDFLARE_ZONE_ID', '02db1dc2dbf6ab755041a60e7d147580'),
  vercelProject: env('VERCEL_PROJECT', 'byte-pulse'),
  // Niche guard — the topic universe this site covers. Off-niche sources
  // are skipped (orchestrator) so a tech clone never publishes recipes and
  // a recipe clone never publishes GPU benchmarks.
  niche: env('SITE_NICHE', 'technology, software, hardware, AI, gaming, mobile, cybersecurity, crypto, science, EV/auto-tech'),
} as const;

export type SiteConfig = typeof SITE;
