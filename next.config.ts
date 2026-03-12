import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large video uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  // Allow serving from /uploads and /exports (handled by API route, not static)
};

export default nextConfig;
