import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
/** Repo root — do not use `process.cwd()` (Turbo may start Next from another directory). */
const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(appDir, "../..");

const { combinedEnv, loadedEnvFiles } = loadEnvConfig(repoRoot);

// Ensure server/runtime sees vars (Turbo does not inject .env files into tasks).
for (const [key, value] of Object.entries(combinedEnv)) {
  if (typeof value === "string" && process.env[key] === undefined) {
    process.env[key] = value;
  }
}

// Optional apps/blog/.env.local overrides (port, etc.)
loadEnvConfig(appDir);

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

const nextConfig: NextConfig = {
  transpilePackages: ["@pakfactory/ui", "@pakfactory/sanity", "@pakfactory/seo"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
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
        source: "/tags-sitemap-:page(\\d{1,}).xml",
        destination: "/tags-sitemap/:page",
      },
    ];
  },
  async redirects() {
    return [
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
