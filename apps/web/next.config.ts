import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
