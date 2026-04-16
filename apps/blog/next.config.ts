import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pakfactory/ui", "@pakfactory/sanity"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
};

export default nextConfig;
