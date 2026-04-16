import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

loadEnvConfig(`${process.cwd()}/../..`);

const nextConfig: NextConfig = {
  transpilePackages: ["@pakfactory/ui", "@pakfactory/sanity"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "cdn.shadcnstudio.com" },
    ],
  },
};

export default nextConfig;
