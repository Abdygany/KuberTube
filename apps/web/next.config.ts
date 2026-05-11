import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@learnspace/api', '@learnspace/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
