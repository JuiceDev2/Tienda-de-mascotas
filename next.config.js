/** @type {import('next').NextConfig} */
// NOTE: next-pwa is intentionally NOT used here. In its default (GenerateSW)
// mode it overwrites public/sw.js at build time with an auto-generated
// Workbox worker, which would wipe out the custom push-notification,
// background-sync and offline-fallback logic already written in
// public/sw.js. That file is registered manually instead
// (see components/shared/PwaRegister.tsx), giving us full control.
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
    ],
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
    {
      // The service worker file itself must never be cached long-term,
      // otherwise browsers/CDNs can serve a stale worker and updates
      // (new icons, new caching logic, bug fixes) never reach users.
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    {
      source: '/manifest.json',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
    },
  ],
};

module.exports = nextConfig;
