import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@astalakshimi/types", "@astalakshimi/validation"],
  // Windows + Turbopack file-cache restore has panicked this repo
  // ("Restore of All for task failed"), which kills `next dev` and
  // surfaces in the browser as TypeError: Failed to fetch on navigation.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    dangerouslyAllowLocalIP: true,
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    localPatterns: [
      {
        pathname: '/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ashtalakshmi-media.s3.ap-south-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'ashtalakshmi-media.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
