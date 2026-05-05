import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

loadEnvConfig(`${process.cwd()}/../..`);

const nextConfig: NextConfig = {
  transpilePackages: ["@pakfactory/ui", "@pakfactory/sanity", "@pakfactory/seo"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
};

export default nextConfig;
