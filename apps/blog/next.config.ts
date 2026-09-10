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
 *      `apps/blog/.env.local` by the time this config is evaluated, so a plain
 *      `loadEnvConfig(repoRoot)` returns that CACHED app-dir result — and it
 *      still reports having loaded `.env.local`, so it looks like it worked.
 *      Every root-only variable stays undefined.
 *
 *   2. WITH it, each call first RESETS `process.env` to the pre-load snapshot
 *      and then applies only the target directory. The reset is unconditional —
 *      force-loading a directory with no `.env` files at all still clears
 *      everything the previous call set (verified against @next/env 16.2.4).
 *
 * So the two calls do not compose on their own: the second discards the first,
 * and only keys present in BOTH files survive. The restore loop is what makes
 * them compose. Same fix as `apps/www` and `apps/admin`; keep the three in step.
 *
 * PRECEDENCE: the app file wins, root fills the gaps. That matches what
 * `scripts/env/switch-env.mjs` documents and warns about — a duplicate key in an
 * app's own `.env.local` shadows the root value, which is why `pnpm env:staging`
 * can appear not to take effect.
 */
const { loadedEnvFiles } = loadEnvConfig(repoRoot, undefined, undefined, true);
const fromRoot = { ...process.env };

loadEnvConfig(appDir, undefined, undefined, true);

for (const [key, value] of Object.entries(fromRoot)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

if (process.env.NODE_ENV === "development") {
  const envFile = loadedEnvFiles[0] ?? join(repoRoot, ".env.local");
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    process.env.SANITY_STUDIO_PROJECT_ID;
  if (!projectId) {
    console.warn(
      `[blog] Sanity project id missing after loading ${envFile}. ` +
        `Copy root .env.local values or set NEXT_PUBLIC_SANITY_PROJECT_ID.`,
    );
  }
}

/**
 * Subpath hosting (PROD-1596 flip): `NEXT_PUBLIC_BLOG_BASE_PATH=/blog` serves the
 * whole app under `/blog` (routes, assets, next/link, rewrites/redirects) — the
 * same env var `src/lib/site.ts` uses for canonicals/JSON-LD/RSS/sitemaps, so one
 * variable flips both. Unset (staging/local) → app stays at origin root.
 * Production: CloudFront routes `pakfactory.com/blog*` to the Vercel origin.
 */
const basePath = process.env.NEXT_PUBLIC_BLOG_BASE_PATH?.trim() || undefined;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
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
  // Let `proxy.ts` own trailing-slash handling so a CMS redirect on a slashed
  // legacy URL (`/blog/old-post/`) goes straight to its target in ONE hop,
  // instead of Next stripping the slash first (308) and the proxy redirecting
  // second (308). The proxy still normalizes `/x/` → `/x` for non-redirect pages.
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@pakfactory/ui", "@pakfactory/sanity", "@pakfactory/seo", "@pakfactory/components", "@pakfactory/redirects", "@pakfactory/sitemap"],
  turbopack: {
    resolveAlias: {
      "@pakfactory/ui/globals.css": join(repoRoot, "packages/ui/src/globals.css"),
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  // PROD-1597: the `/category/` prefix was removed — archives live at `/{category}`.
  // Posts are canonical at `/{postSlug}` (root); category/tag/search are discovery
  // only, never URL scoping. Permanently redirect old indexed URLs. More specific
  // (pagination) first. basePath is applied automatically.
  // Flat, Yoast-style sub-sitemap URLs (`/posts-sitemap-1.xml`) served by the
  // paginated `[page]` route handlers. App Router can't embed a dynamic number
  // mid-segment (`posts-sitemap-[page].xml`), and a root dynamic segment would
  // collide with `[category]`, so the pretty URL is a rewrite onto the handler.
  async rewrites() {
    return [
      {
        source: "/posts-sitemap-:page(\\d{1,}).xml",
        destination: "/posts-sitemap/:page",
      },
      {
        source: "/topics-sitemap-:page(\\d{1,}).xml",
        destination: "/topics-sitemap/:page",
      },
    ];
  },
  async redirects() {
    return [
      // PROD-2168: canonicalize the blog index trailing slash (`/blog/` → `/blog`).
      // Blog posts already normalize (proxy 308), but the index slips through: under
      // basePath the app CANNOT distinguish `/blog` from `/blog/` — Next strips the
      // base path and both become `/`, so a proxy rule would loop `/blog` → `/blog`.
      // It must be a routing-layer rule on the RAW path: `basePath: false` opts this
      // rule out of the automatic `/blog` prefix, so `source` matches the literal
      // `/blog/` and redirects to `/blog` without matching (and looping on) `/blog`.
      // Prod-only — gated on basePath, since staging/preview serve at origin root and
      // have no `/blog` path. next.config redirects run before the proxy (see note
      // below), so this fires ahead of edge redirect resolution.
      ...(basePath
        ? [
            {
              source: `${basePath}/`,
              destination: basePath,
              permanent: true,
              basePath: false as const,
            },
          ]
        : []),
      // PROD-2140: legacy WordPress RSS feeds → the new feed at `/rss.xml`
      // (→ `/blog/rss.xml` under basePath). Every WP feed URL ends in a `/feed`
      // segment — main `/feed/`, `/comments/feed/`, and per-category/tag/author/
      // post `.../feed/` — so these two rules 301 the whole family in one place.
      // MUST stay ABOVE the `/category/*` rules below: next.config redirects run
      // in array order (first match wins) AND before `proxy.ts`, so without this
      // `/category/{c}/feed/` would be caught by `/category/:category/:postSlug`
      // → `/{feed}` → 404 before any feed rule could fire. `skipTrailingSlashRedirect`
      // + the proxy's trailing-slash canonicalization keep `/feed/` a single hop.
      // `statusCode: 301` (NOT `permanent: true`) — Next emits 308 for `permanent`,
      // but PROD-2140's AC requires a literal **301** for the legacy feed moves, and
      // 301 is the conventional WordPress-migration signal feed readers/crawlers expect.
      {
        // Root feed (and its `?feed=` cousins land on `/feed` after WP rewriting).
        source: "/feed",
        destination: "/rss.xml",
        statusCode: 301,
      },
      {
        // Any nested feed: `/category/{c}/feed`, `/tag/{t}/feed`, `/author/{a}/feed`,
        // `/comments/feed`, per-post `/{post}/feed`. `:path*` = one-or-more segments.
        // Placed first, so it wins over the `/category/*` 308 rules below for
        // `/category/{c}/feed` — single hop, correct 301.
        source: "/:path*/feed",
        destination: "/rss.xml",
        statusCode: 301,
      },
      // PROD-2197: legacy WordPress AMP URLs. The old blog served an AMP copy of
      // every post at `/blog/{slug}/amp/`; those 404 on the Sanity blog (worse —
      // `/blog/{slug}/amp` is swallowed by the `/category/:category/:postSlug`
      // collapse below into `/blog/amp` before 404ing). Strip the `/amp` suffix
      // and 301 to the canonical post, reusing the captured head.
      //
      // `:slug+` = one-or-more segments, so a category-scoped AMP URL
      // (`/{category}/{slug}/amp`) strips to `/{category}/{slug}` and then chains
      // through the existing category redirects — the one allowed extra hop.
      // MUST stay ABOVE the `/category/*` rules: next.config redirects run in array
      // order AND before `proxy.ts`, so this wins the race that otherwise produces
      // `/blog/amp`. This is a capture-and-transform, which the CMS engine cannot
      // express (exact/prefix/phrase only, fixed destinations) — it belongs here,
      // like the `/feed` and `/category/*` capture rules. `statusCode: 301` (not
      // `permanent: true`, which emits 308) — AC requires a literal 301 to pass
      // link equity from old AMP inbound links.
      {
        source: "/:slug+/amp",
        destination: "/:slug+",
        statusCode: 301,
      },
      {
        source: "/tags-sitemap-:page(\\d{1,}).xml",
        destination: "/topics-sitemap-:page.xml",
        permanent: true,
      },
      {
        source: "/tags-sitemap",
        destination: "/topics-sitemap-1.xml",
        permanent: true,
      },
      // NOTE: legacy `/tag/:slug[/page/:n]` → `/topics/:slug` moved to
      // `middleware.ts` (PROD-2154). next.config `redirects` run BEFORE
      // middleware, so keeping them here would pre-empt CMS `redirect` docs for
      // tag paths (e.g. tags that should go to the blog home, not a 404 topic).
      {
        source: "/category/:category/page/:n",
        destination: "/:category/page/:n",
        permanent: true,
      },
      {
        // Legacy `/category/{cat}/{post}` → canonical root post URL.
        source: "/category/:category/:postSlug",
        destination: "/:postSlug",
        permanent: true,
      },
      {
        source: "/category/:category",
        destination: "/:category",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
