/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Point to the monorepo root where the root package.json lives
    root: '../../',
  },
  reactStrictMode: true,
  // Disable turbopack for production build if it causes hangs
  experimental: {
    turbo: {
      // Disable for production build stability
    },
  },
}

module.exports = nextConfig
