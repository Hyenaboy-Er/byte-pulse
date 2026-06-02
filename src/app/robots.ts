import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

// Single-sourced from the keystone. robots.txt's Sitemap: directive is
// how crawlers discover the sitemaps — the old `?? 'http://localhost:3000'`
// broke on empty env and pointed crawlers at the apex (redirecting) host.
const SITE_URL = SITE.url;

export default function robots(): MetadataRoute.Robots {
  // We put the explicit Googlebot / Bingbot / DuckDuckBot rules BEFORE the
  // generic "*" rule. Some audit tools (eg. adsenseeligibilitychecker.org)
  // pattern-match "User-agent: *" + "Disallow:" and falsely report
  // "robots.txt is blocking Googlebot" even when the actual rule is just
  // /api/ + /admin. Explicit per-bot allow rules satisfy both the lazy
  // pattern-matchers AND make our crawl intentions unambiguous.
  return {
    rules: [
      // Major search-engine bots — explicit unrestricted welcome.
      { userAgent: 'Googlebot', allow: '/', disallow: ['/admin'] },
      { userAgent: 'Googlebot-Image', allow: '/' },
      { userAgent: 'Googlebot-News', allow: '/' },
      { userAgent: 'AdsBot-Google', allow: '/' },
      { userAgent: 'Mediapartners-Google', allow: '/' },
      { userAgent: 'Bingbot', allow: '/', disallow: ['/admin'] },
      { userAgent: 'DuckDuckBot', allow: '/', disallow: ['/admin'] },
      // Catch-all rule for everyone else. We still block /api/ (server
      // routes, not user-facing) and /admin, but explicitly allow /api/og
      // because OG images render social previews and Discover cards.
      {
        userAgent: '*',
        allow: ['/', '/api/og'],
        disallow: ['/api/', '/admin', ...(SITE.deEnabled ? [] : ['/de'])],
      },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
      `${SITE_URL}/image-sitemap.xml`,
    ],
  };
}
