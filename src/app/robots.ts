import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

// Single-sourced from the keystone. robots.txt's Sitemap: directive is
// how crawlers discover the sitemaps — the old `?? 'http://localhost:3000'`
// broke on empty env and pointed crawlers at the apex (redirecting) host.
const SITE_URL = SITE.url;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin'] },
      // Explicitly welcome Google News crawler
      { userAgent: 'Googlebot-News', allow: '/' },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
    ],
  };
}
