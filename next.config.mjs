/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  // libSQL ships markdown files inside its package; webpack chokes if it tries to bundle them.
  // Treat libsql/prisma adapter as external — they run server-side only anyway.
  serverExternalPackages: [
    '@libsql/client',
    '@libsql/isomorphic-fetch',
    '@libsql/isomorphic-ws',
    '@prisma/adapter-libsql',
    '@prisma/client',
    'libsql',
  ],
  poweredByHeader: false,
  async redirects() {
    return [
      // Convention some crawlers try; route them to the real feed.
      { source: '/rss', destination: '/feed.xml', permanent: true },
      { source: '/rss.xml', destination: '/feed.xml', permanent: true },
      { source: '/de/rss', destination: '/de/feed.xml', permanent: true },
      { source: '/de/rss.xml', destination: '/de/feed.xml', permanent: true },
      // Category-slug aliases. External sites + AI-generated SEO audits often
      // assume canonical English names ('cybersecurity', 'tech') that don't
      // match our internal taxonomy. Redirect them to the real category
      // (or home for non-existent ones) so we don't drop the backlink juice
      // or cause confusing 404s.
      { source: '/category/cybersecurity', destination: '/category/security', permanent: true },
      { source: '/de/category/cybersecurity', destination: '/de/category/security', permanent: true },
      { source: '/category/tech', destination: '/', permanent: true },
      { source: '/de/category/tech', destination: '/de', permanent: true },
      // Apex byte-pulse.net → www (permanent for SEO PageRank consolidation).
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'byte-pulse.net' }],
        destination: 'https://www.byte-pulse.net/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];
    // Aggressive CDN cache for article pages: content rarely changes after
    // publish, and the writer re-pings IndexNow when it does. 1h browser
    // cache + 24h CDN cache + 7d stale-while-revalidate means the SECOND
    // visit to any article loads instantly from the browser disk cache,
    // and Vercel Edge handles subsequent first-visits from cache without
    // a cold start. Massive mobile speed win.
    const articleCache = [
      ...security,
      { key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' },
    ];
    return [
      { source: '/article/:slug*', headers: articleCache },
      { source: '/de/article/:slug*', headers: articleCache },
      // Static asset routes (Next.js images, RSS feeds): long browser cache.
      { source: '/feed.xml', headers: [...security, { key: 'Cache-Control', value: 'public, max-age=600, s-maxage=3600' }] },
      { source: '/de/feed.xml', headers: [...security, { key: 'Cache-Control', value: 'public, max-age=600, s-maxage=3600' }] },
      { source: '/:path*', headers: security },
    ];
  },
};
export default nextConfig;
