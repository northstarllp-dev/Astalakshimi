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
    localPatterns: [
      {
        pathname: '/**',
      },
      {
        pathname: '/api/proxy/**',
        search: '?*',
      },
      {
        pathname: '/api/proxy/media/image',
        search: '?key=*',
      },
      {
        pathname: '/api/proxy/media/image/**',
        search: '?key=*',
      },
    ],
    remotePatterns: [
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
