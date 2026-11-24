import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

    return [
      {
        source: "/api/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "server",
        port: "5000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "cdn-new.topcv.vn",
      },
      {
        protocol: "https",
        hostname: "static.topcv.vn",
      },
      {
        protocol: "https",
        hostname: "www.topcv.vn",
      },
    ],
  },

  devIndicators: false,

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;