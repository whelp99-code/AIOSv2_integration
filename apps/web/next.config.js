/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aios/data-plane'],
  turbopack: {
    root: '../../',
  },
  reactStrictMode: true,
}

module.exports = nextConfig
