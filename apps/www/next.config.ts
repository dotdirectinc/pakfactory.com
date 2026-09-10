import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root — do not use `process.cwd()` (Turbo may start Next from another directory). */
const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(appDir, "../..");

/**
 * Merge the ROOT `.env.local` with this app's own. Both calls are needed, and so
 * is the restore loop — dropping it breaks local dev in a way that looks like a
 * Supabase misconfiguration.
 *
 * TWO separate @next/env behaviours are in play, and they pull opposite ways:
 *
 *   1. WITHOUT `forceReload`, @next/env caches on its FIRST call and later calls
 *      for a different directory are no-ops. Next has already loaded
 *      `apps/www/.env.local` by the time this config is evaluated, so a plain
 *      `loadEnvConfig(repoRoot)` returns that cached app-dir result and assigns
 *      nothing. It even reports having loaded `.env.local`, which is what makes
 *      it so hard to spot.
 *
 *   2. WITH `forceReload`, each call first RESETS `process.env` to the snapshot
 *      taken before the very first load, then applies only the target
 *      directory's files. The reset is unconditional — verified against
 *      @next/env 16.2.4 by force-loading a directory containing no `.env` files
 *      at all, which still cleared everything the previous call had set.
 *
 * So two force-reloads do not compose: the second silently discards the first,
 * and only keys that happen to exist in BOTH files survive. That is the bug this
 * loop fixes. It presented as signup failing with "Your project's URL and Key
 * are required to create a Supabase client!" while Sanity kept working — Sanity
 * is in both files, Supabase is root-only.
 *
 * It is not only Supabase: `SERVICE_SHARED_SECRET`, `BACKEND_API_BASE_URL`,
 * `WWW_ORIGIN_PROXY_SECRET` and `GOOGLE_PLACES_API_KEY` are all root-only too,
 * so the backend API calls, the origin lockdown and Places autocomplete were
 * silently unconfigured in dev by the same mechanism.
 *
 * PRECEDENCE: the app file wins. Only keys the app-dir pass left undefined are
 * restored from the root snapshot. That matches what `scripts/env/switch-env.mjs`
 * documents and warns about — a duplicate key in an app's own `.env.local` shadows the
 * root value, which is why `pnpm env:staging` can appear not to take effect.
 *
 * Local dev only — on Vercel the platform populates process.env directly and no
 * .env.local exists, so both calls are no-ops there.
 */
loadEnvConfig(repoRoot, undefined, undefined, true);
const rootEnv = { ...process.env };
loadEnvConfig(appDir, undefined, undefined, true);
for (const [key, value] of Object.entries(rootEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

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

/** Turbopack PostCSS resolves @import from repo root — alias workspace CSS to packages/. */
const workspaceCssAliases = {
  "@pakfactory/ui/globals.css": join(repoRoot, "packages/ui/src/globals.css"),
  "@pakfactory/ui/tailwind-sources.css": join(
    repoRoot,
    "packages/ui/src/tailwind-sources.css",
  ),
  "@pakfactory/components/tailwind-sources.css": join(
    repoRoot,
    "packages/components/src/tailwind-sources.css",
  ),
  "@pakfactory/brief-builder-ui/tailwind-sources.css": join(
    repoRoot,
    "packages/brief-builder-ui/src/tailwind-sources.css",
  ),
} as const;

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
  transpilePackages: ["@pakfactory/ui", "@pakfactory/sanity", "@pakfactory/components", "@pakfactory/redirects", "@pakfactory/sitemap", "@pakfactory/supabase", "@pakfactory/auth-ui", "@pakfactory/brief-builder-ui", "@pakfactory/geo", "next-sanity"],
  turbopack: {
    resolveAlias: workspaceCssAliases,
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
  async redirects() {
    return [
      {
        source: "/capabilities",
        destination: "/customizations",
        permanent: true,
      },
      {
        source: "/capabilities/:category",
        destination: "/customizations/:category",
        permanent: true,
      },
      {
        source: "/capabilities/:category/:handle",
        destination: "/customizations/:category/:handle",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
