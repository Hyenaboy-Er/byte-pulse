import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StickyAdBar from '@/components/StickyAdBar';
import CookieBanner from '@/components/CookieBanner';
import ThirdPartyScripts from '@/components/ThirdPartyScripts';
import DeferredOverlays from '@/components/DeferredOverlays';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const HOME_TITLE = 'Latest tech news, AI, gaming, hardware — Byte-Pulse';
const HOME_DESCRIPTION =
  'Byte-Pulse covers the latest in AI, gaming, hardware, mobile, software and security. Bilingual EN/DE, fact-checked, updated every 15 minutes.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: `%s · ${SITE_NAME}` },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: '/',
    languages: { 'en-US': '/', 'de-DE': '/de' },
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const h = await headers();
  const pathname = h.get('x-pathname') || '/';
  const isDE = pathname === '/de' || pathname.startsWith('/de/');
  return (
    <html lang={isDE ? 'de' : 'en'} className="dark">
      <head>
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
                '@type': 'Organization',
                name: SITE_NAME,
                url: SITE_URL,
                logo: `${SITE_URL}/icon.svg`,
                sameAs: ['https://twitter.com/bytePulsenew'],
                contactPoint: {
                  '@type': 'ContactPoint',
                  contactType: 'editorial',
                  email: process.env.NEXT_PUBLIC_SITE_EMAIL ?? 'hello@byte-pulse.net',
                  availableLanguage: ['en', 'de'],
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
