import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root — do not use `process.cwd()` (Turbo may start Next from another directory). */
const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(appDir, "../..");

loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  // Monorepo: trace from repo root so hoisted `sharp` / `@img/*` native bins
  // are included in Vercel serverless functions (PROD-2206 `/api/wm` serve mode).
  outputFileTracingRoot: repoRoot,
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/wm": [
      "node_modules/sharp/**/*",
      "node_modules/@img/sharp-libvips-linuxmusl-x64/**/*",
      "node_modules/@img/sharp-libvips-linux-x64/**/*",
      "node_modules/@img/sharp-linuxmusl-x64/**/*",
      "node_modules/@img/sharp-linux-x64/**/*",
    ],
  },
  transpilePackages: ["@pakfactory/ui", "@pakfactory/sanity", "@pakfactory/components", "@pakfactory/redirects", "@pakfactory/sitemap", "next-sanity"],
  turbopack: {
    resolveAlias: {
      "@pakfactory/ui/globals.css": join(repoRoot, "packages/ui/src/globals.css"),
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "cdn.shadcnstudio.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
