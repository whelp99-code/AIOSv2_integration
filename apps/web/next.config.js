/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Point to the monorepo root where the root package.json lives
    root: '../../',
  },
  reactStrictMode: true,
}

module.exports = nextConfig
