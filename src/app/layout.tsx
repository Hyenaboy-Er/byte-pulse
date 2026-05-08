import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StickyAdBar from '@/components/StickyAdBar';
import CookieBanner from '@/components/CookieBanner';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// SEO-tuned: keyword-rich title + concise description that reads naturally.
const HOME_TITLE = 'Latest tech news, AI, gaming, hardware — Byte-Pulse';
const HOME_DESCRIPTION =
  'Byte-Pulse covers the latest in AI, gaming, hardware, mobile, software and security. Bilingual EN/DE, fact-checked, updated every 15 minutes.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: `%s · ${SITE_NAME}` },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'tech news', 'AI news', 'gaming news', 'hardware news', 'mobile',
    'software', 'cybersecurity', 'crypto', 'science', 'EV',
    'Byte-Pulse', 'tech magazine', 'European tech',
  ],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: HOME_TITLE, description: HOME_DESCRIPTION },
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return (
    <html lang="en" className="dark">
      <head>
        {adsenseClient ? (
          <>
            {/* Default to denied consent until the user picks in CookieBanner. */}
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
        <Header />
        <main className="flex-1 pb-24">{children}</main>
        <Footer />
        <StickyAdBar />
        <CookieBanner />
      </body>
    </html>
  );
}
