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
};
export default nextConfig;
