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
    return [
      { source: '/:path*', headers: security },
    ];
  },
};
export default nextConfig;
