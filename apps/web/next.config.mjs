/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@kubertube/config",
    "@kubertube/core",
    "@kubertube/api-types",
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
