/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'better-sqlite3' on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'better-sqlite3': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;