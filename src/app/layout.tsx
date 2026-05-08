import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StickyAdBar from '@/components/StickyAdBar';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'TechPuls';
const TAGLINE = process.env.NEXT_PUBLIC_SITE_TAGLINE ?? 'Tech-News, Gaming, KI – alles was heute zählt.';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} – ${TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: TAGLINE,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: TAGLINE,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: TAGLINE },
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  return (
    <html lang="en" className="dark">
      <head>
        {adsenseClient ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pb-24">{children}</main>
        <Footer />
        <StickyAdBar />
      </body>
    </html>
  );
}
