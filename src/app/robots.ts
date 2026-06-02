import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

// Single-sourced from the keystone. robots.txt's Sitemap: directive is
// how crawlers discover the sitemaps — the old `?? 'http://localhost:3000'`
// broke on empty env and pointed crawlers at the apex (redirecting) host.
const SITE_URL = SITE.url;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // `/api/og` (and `/api/og-proxy`) serve the social/Discover
        // preview images every article's og:image points to. Blocking
        // them under Disallow: /api/ made GSC report "blocked by
        // robots.txt" (2026-05-18) and stopped Google fetching the
        // preview image → weaker Discover/rich cards. Longer, more
        // specific Allow wins over Disallow in Googlebot, so the rest
        // of /api/ stays blocked.
        allow: ['/', '/api/og'],
        // /de disallowed when the German layer is off (SITE.deEnabled=
        // false): all /de pages are noindexed via the de/ layout — also
        // stop wasting crawl budget on them.
        disallow: ['/api/', '/admin', ...(SITE.deEnabled ? [] : ['/de'])],
      },
      // Explicitly welcome Google News crawler
      { userAgent: 'Googlebot-News', allow: '/' },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
      `${SITE_URL}/image-sitemap.xml`,
    ],
  };
}
