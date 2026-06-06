import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StickyAdBar from '@/components/StickyAdBar';
import CookieBanner from '@/components/CookieBanner';
import ThirdPartyScripts from '@/components/ThirdPartyScripts';
import DeferredOverlays from '@/components/DeferredOverlays';
import { SITE } from '@/lib/site';

// Single-sourced from the keystone. Critical: this drives metadataBase →
// canonical/OG/hreflang for the WHOLE site. The old
// `?? 'http://localhost:3000'` broke on Vercel where NEXT_PUBLIC_SITE_URL
// was '' (empty ≠ undefined, so `??` did NOT fall back) — canonical
// resolved to the apex byte-pulse.net which 308-redirects to www. A
// canonical pointing at a redirecting URL suppresses indexing on Google
// AND Bing. site.ts's env() treats '' as missing → correct www host.
const SITE_NAME = SITE.name;
const SITE_URL = SITE.url;

const HOME_TITLE = 'Latest tech news, AI, gaming, hardware — Byte-Pulse';
const HOME_DESCRIPTION =
  'Byte-Pulse covers the latest in AI, gaming, hardware, mobile, software and security. Fact-checked against the original source.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: `%s · ${SITE_NAME}` },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: '/',
    languages: { 'en-US': '/' },
    types: { 'application/rss+xml': '/feed.xml' },
  },
  keywords: [
    'tech news', 'AI news', 'gaming news', 'hardware news', 'mobile',
    'software', 'cybersecurity', 'crypto', 'science', 'EV',
    'Byte-Pulse', 'tech magazine', 'European tech',
  ],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: HOME_TITLE, description: HOME_DESCRIPTION },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // AdSense Publisher ID. Hardgecoded am 2026-06-06 für Submission;
  // env var bleibt als Override falls später nötig.
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-7174734517406918';
  // Brave Creators verification — required for Brave-browser users to send us
  // BAT tips passively as they read. Verification token comes from
  // creators.brave.com once we register the domain there. Zero-cost passive
  // income source — no minimum traffic.
  const braveCreatorToken = process.env.NEXT_PUBLIC_BRAVE_VERIFICATION_TOKEN;
  // English-only site (DE layer retired). Static lang="en" + no client-side
  // lang switching keeps the root layout fully STATIC, which is the
  // prerequisite for Next.js / Vercel CDN caching to apply Cache-Control
  // headers on article pages.
  return (
    <html lang="en" className="dark">
      <head>
        {/* DNS-preconnect to image hosts so the first article click doesn't
            wait ~150ms TLS-handshake per host on mobile. Top hosts in our
            article corpus: heise.cloudimg.io, golem.de, techcrunch.com, etc.
            We also preconnect to own origin for the /api/og-proxy hop. */}
        <link rel="preconnect" href="https://heise.cloudimg.io" />
        <link rel="dns-prefetch" href="https://heise.cloudimg.io" />
        <link rel="dns-prefetch" href="https://techcrunch.com" />
        <link rel="dns-prefetch" href="https://www.golem.de" />
        <link rel="dns-prefetch" href="https://stadt-bremerhaven.de" />
        <link rel="dns-prefetch" href="https://assets-prd.ignimgs.com" />
        <link rel="dns-prefetch" href="https://static0.anpoimages.com" />
        <link rel="dns-prefetch" href="https://www.engadget.com" />
        {/* Brave Creators verification meta-tag. Once verified at
            creators.brave.com, Brave-browser users can tip via BAT — and Brave
            also pays revenue share for ads its users see on this site. */}
        {braveCreatorToken && (
          <meta name="brave-rewards-verification" content={braveCreatorToken} />
        )}
        {/* Domain & publication age signals. Many automated audit tools
            (AdSense readiness checkers, broker reports) try WHOIS first;
            when WHOIS is privacy-protected (which our registrar is) they
            fall back to scraping meta tags / JSON-LD. We expose the
            founding date through every channel a parser might check. */}
        <meta name="dcterms.created" content="2026-05-12" />
        <meta name="dcterms.modified" content={new Date().toISOString().slice(0, 10)} />
        <meta name="article:published_time" content="2026-05-12T00:00:00Z" />
        <meta name="organization-founding-date" content="2026-05-12" />
        <meta name="generator" content="Byte-Pulse newsroom (Next.js, founded 2026)" />
        {/* Search-engine verification + publisher signals. The .html files in
            /public satisfy webmaster-tools file verification; these meta
            tags are the alternate path some audit tools check. */}
        <meta name="google-site-verification" content="google9f0b4779ce3338f3" />
        <meta name="msvalidate.01" content="bing-byte-pulse-net" />
        <meta name="news_keywords" content="AI news, hardware news, gaming news, mobile news, cybersecurity, crypto, EV, science" />
        <meta name="syndication-source" content="https://www.byte-pulse.net/feed.xml" />
        <meta name="original-source" content="https://www.byte-pulse.net" />
        {/* Sitemap discovery link - some scrapers parse only HEAD links */}
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
        <link rel="alternate" type="application/rss+xml" title="Byte-Pulse RSS" href="/feed.xml" />
        {adsenseClient ? (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});`,
              }}
            />
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
              crossOrigin="anonymous"
            />
          </>
        ) : null}
        {/* Google Analytics 4 — activated by NEXT_PUBLIC_GA4_ID env var.
            AdSense eligibility audits look for either GA or GTM tags as a
            "site is actively measured" signal. We default-deny consent and
            let CookieBanner flip it via gtag('consent', 'update', …). When
            AdSense is also active they share the same dataLayer + gtag. */}
        {process.env.NEXT_PUBLIC_GA4_ID ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA4_ID}',{anonymize_ip:true,send_page_view:true});`,
              }}
            />
          </>
        ) : null}
      </head>
      <body className="min-h-screen flex flex-col">
        {/* Organization + WebSite JSON-LD — global trust signal. Google
            picks this up for rich-results, AdSense uses it as a publisher
            identity signal, and bing.com/news uses it for inclusion. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'NewsMediaOrganization',
                name: SITE_NAME,
                url: SITE_URL,
                logo: {
                  '@type': 'ImageObject',
                  url: `${SITE_URL}/icon.svg`,
                  width: 512,
                  height: 512,
                },
                // sameAs feeds Google's Knowledge Graph — every brand-owned
                // channel earns trust. Empty array would downweight the
                // organisation as "online-only mention".
                sameAs: [
                  'https://x.com/bytePulsenew',
                  'https://mastodon.social/@BytePulseNet',
                  'https://bsky.app/profile/byte-pulse.bsky.social',
                  'https://www.youtube.com/@Byte-PulseNet',
                  'https://www.tiktok.com/@bytepulse.net',
                ],
                contactPoint: [
                  {
                    '@type': 'ContactPoint',
                    contactType: 'editorial',
                    email: SITE.email,
                    availableLanguage: ['en'],
                  },
                  {
                    '@type': 'ContactPoint',
                    contactType: 'corrections',
                    email: SITE.email,
                    availableLanguage: ['en'],
                  },
                ],
                // Explicit pointers to E-E-A-T policy pages — Google reads these.
                publishingPrinciples: `${SITE_URL}/editorial-policy`,
                correctionsPolicy: `${SITE_URL}/corrections`,
                actionableFeedbackPolicy: `${SITE_URL}/contact`,
                missionCoveragePrioritiesPolicy: `${SITE_URL}/about`,
                diversityPolicy: `${SITE_URL}/editorial-policy`,
                ethicsPolicy: `${SITE_URL}/editorial-policy`,
                masthead: `${SITE_URL}/authors`,
                foundingDate: '2026-05-12',
                // Verified human founder — Google's strongest single E-E-A-T
                // signal for an independent publication.
                founder: {
                  '@type': 'Person',
                  name: SITE.founderName,
                  jobTitle: 'Founder & Editor-in-Chief',
                  url: `${SITE_URL}/author/serhat-er`,
                  sameAs: [
                    process.env.SITE_FOUNDER_LINKEDIN ?? 'https://www.linkedin.com/in/serhat-er-brlvision/',
                    'https://x.com/bytePulsenew',
                  ],
                },
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: SITE_NAME,
                url: SITE_URL,
                potentialAction: {
                  '@type': 'SearchAction',
                  target: `${SITE_URL}/search?q={search_term_string}`,
                  'query-input': 'required name=search_term_string',
                },
              },
            ]),
          }}
        />
        <Header />
        <main className="flex-1 pb-24">{children}</main>
        <Footer />
        <StickyAdBar />
        <CookieBanner />
        <DeferredOverlays />
        <ThirdPartyScripts />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
