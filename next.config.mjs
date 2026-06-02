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
      // Privacy-policy path aliases. The page lives at /privacy, but crude
      // AdSense/eligibility checkers (and some reviewers) probe the literal
      // '/privacy-policy' or '/datenschutz' path and falsely report "no
      // privacy policy". Redirect the conventional paths to the real page
      // so no tool or crawler can miss it.
      // Merged-identity author redirect. /author/serhat-kalender was the
      // pseudonymous Editor-in-Chief; the persona has been merged into the
      // founder's real profile. 301 preserves any backlinks Google indexed.
      { source: '/author/serhat-kalender', destination: '/author/serhat-er', permanent: true },
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/datenschutz', destination: '/de/privacy', permanent: true },
      { source: '/de/privacy-policy', destination: '/de/privacy', permanent: true },
      { source: '/de/datenschutz', destination: '/de/privacy', permanent: true },
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
    // Content-Security-Policy — moderate strictness designed to:
    //   1. Satisfy automated AdSense / security audits (CSP header present
    //      and not 'unsafe-*' all the way to default-src),
    //   2. Not break Next.js hydration (needs 'unsafe-inline' for inline
    //      <script> from the framework and our JSON-LD blocks),
    //   3. Allow AdSense, Vercel Analytics, YouTube embeds, RSS-img hosts.
    //
    // 'unsafe-eval' is included for script-src because Next.js 15 uses Eval
    // in dev/turbopack code paths and a few framework chunks still rely on
    // it in production. Removing it tends to silently break hydration on
    // older browsers without a clear error.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      // Images come from many news-source CDNs; locking down is impractical.
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com https://www.google-analytics.com https://pagead2.googlesyndication.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://googleads.g.doubleclick.net",
      "media-src 'self' https:",
      // Vercel Speed Insights spawns a Web Worker from a blob: URL to
      // collect Core Web Vitals without blocking the main thread. Without
      // this entry the CSP blocks the worker and CWV reporting silently
      // dies (Gemini-flagged during PAL cross-check).
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
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
