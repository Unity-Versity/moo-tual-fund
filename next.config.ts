import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL("https://farmsteadmeats.com.au/**")],
  },
};

export default nextConfig;
