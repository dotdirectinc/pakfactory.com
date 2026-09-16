import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root — do not use `process.cwd()` (Turbo may start Next from another directory). */
const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(appDir, "../..");

/**
 * Merge the ROOT `.env.local` with this app's own. Turbo does not inject `.env`
 * files into tasks, so without this the root file is never read at all.
 *
 * `forceReload` (the 4th argument) is load-bearing in BOTH calls, for two
 * different reasons:
 *
 *   1. WITHOUT it, @next/env caches on its FIRST call and later calls for a
 *      different directory are no-ops. Next has already loaded
 *      `apps/www/.env.local` by the time this config is evaluated, so a plain
 *      `loadEnvConfig(repoRoot)` returns that CACHED app-dir result — and it
 *      still reports having loaded `.env.local`, so it looks like it worked.
 *      Every root-only variable stays undefined. That is exactly what this file
 *      did until now: `loadEnvConfig(repoRoot)` on its own, which is why
 *      `apps/www/.env.local` had to carry a duplicate of every root value.
 *
 *   2. WITH it, each call first RESETS `process.env` to the pre-load snapshot
 *      and then applies only the target directory. The reset is unconditional —
 *      force-loading a directory with no `.env` files at all still clears
 *      everything the previous call set.
 *
 * So the two calls do not compose on their own: the second discards the first,
 * and only keys present in BOTH files survive. The restore loop is what makes
 * them compose.
 *
 * PRECEDENCE: the app file wins, root fills the gaps. Identical to
 * `apps/blog/next.config.ts` — keep the two in step.
 */
loadEnvConfig(repoRoot, undefined, undefined, true);
const fromRoot = { ...process.env };

loadEnvConfig(appDir, undefined, undefined, true);

for (const [key, value] of Object.entries(fromRoot)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

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
