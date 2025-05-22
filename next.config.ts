import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  eslint: {
    // Disable ESLint during build (we'll still see warnings in development)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
