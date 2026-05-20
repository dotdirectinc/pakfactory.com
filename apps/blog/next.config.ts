import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { BLOG_BASE_PATH } from "./src/lib/base-path";

loadEnvConfig(`${process.cwd()}/../..`);

loadEnvConfig(`${process.cwd()}/../..`);

const nextConfig: NextConfig = {
  basePath: BLOG_BASE_PATH,
  transpilePackages: ["@pakfactory/ui", "@pakfactory/sanity", "@pakfactory/seo"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
};

export default nextConfig;
