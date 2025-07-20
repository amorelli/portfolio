/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration optimized for Vercel Postgres
  experimental: {
    // No external packages needed for @vercel/postgres
  },
};

module.exports = nextConfig;