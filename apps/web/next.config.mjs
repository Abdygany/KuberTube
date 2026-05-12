/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@kubertube/config"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
