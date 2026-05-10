/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@learnspace/api-types', '@learnspace/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
