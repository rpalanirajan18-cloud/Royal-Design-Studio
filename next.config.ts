import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["puppeteer", "@prisma/client", "bcryptjs"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
