import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root — do not use `process.cwd()` (Turbo may start Next from another directory). */
const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(appDir, "../..");

/**
 * `forceReload` is load-bearing, not defensive.
 *
 * @next/env caches on its FIRST call and later calls for a different directory
 * are no-ops — they return the cached result and assign nothing. Next loads
 * `apps/www/.env.local` before evaluating this config, so a plain
 * `loadEnvConfig(repoRoot)` silently returns that cached app-dir result and every
 * root-only variable stays undefined. It even reports having loaded `.env.local`,
 * which is what makes it so hard to spot.
 *
 * That was invisible while every www variable also existed in the app-level file.
 * It surfaced the moment NEXT_PUBLIC_SUPABASE_URL was added to the repo root
 * only: signup failed with "Your project's URL and Key are required to create a
 * Supabase client!" while Sanity kept working.
 *
 * Local dev only — on Vercel the platform populates process.env directly and no
 * .env.local exists.
 */
loadEnvConfig(repoRoot, undefined, undefined, true);

/**
 * Non-production origins must never be indexed (PROD-2404, extends PROD-2207).
 *
 * `staging.pakfactory.com` is a **preview** deployment of `www-new-release`, so its
 * `VERCEL_ENV` is `preview`. The only other place this app emits `X-Robots-Tag` is
 * the origin-lockdown redirect in `src/proxy.ts`, which is deliberately
 * production-only and whose matcher skips `_next/`, `api/`, and any path with a dot
 * — so nothing was stamping preview responses at all.
 *
 * Vercel Authentication already walls staging off from crawlers; this header is
 * defence in depth for the day protection is relaxed (shareable link, automation
 * bypass token) and for the assets the proxy never sees.
 *
 * Kept in step with `WWW_DISABLE_INDEXING` — the same kill-switch `src/lib/seo.ts`
 * uses for page-level `robots` metadata. Parsed inline rather than imported so
 * `next.config.ts` stays free of app-source imports.
 */
function shouldSendNoIndexHeader(): boolean {
  const killSwitch = process.env.WWW_DISABLE_INDEXING?.trim().toLowerCase();
  if (killSwitch && ["1", "true", "yes", "on"].includes(killSwitch)) return true;
  // Anything that is not a Vercel production build: preview, development, local.
  return process.env.VERCEL_ENV !== "production";
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
  transpilePackages: ["@pakfactory/ui", "@pakfactory/sanity", "@pakfactory/components", "@pakfactory/redirects", "@pakfactory/sitemap", "@pakfactory/supabase", "@pakfactory/auth-ui", "@pakfactory/brief-builder-ui", "next-sanity"],
  turbopack: {
    resolveAlias: {
      "@pakfactory/ui/globals.css": join(repoRoot, "packages/ui/src/globals.css"),
    },
  },
  async headers() {
    if (!shouldSendNoIndexHeader()) return [];
    return [
      {
        // Every response this app serves, including `/_next/*` and static files
        // the proxy matcher excludes.
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
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
