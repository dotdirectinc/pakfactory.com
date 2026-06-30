/**
 * Public site origin + base path for the blog app (canonicals, JSON-LD, RSS, sitemap).
 *
 * Set `NEXT_PUBLIC_SITE_URL` in repo root `.env.local`
 * (e.g. `https://blog.pakfactory.com`, `https://www.pakfactory.com`, or `http://localhost:3003`).
 *
 * `NEXT_PUBLIC_SITE_URL` is the **origin only** (scheme + host, no path). The blog's
 * path prefix lives in `BLOG_BASE_PATH` so the future move from subdomain
 * (`blog.pakfactory.com/…`) to subpath (`pakfactory.com/blog/…`) is a config flip:
 * set `basePath: '/blog'` in `next.config.ts` AND `NEXT_PUBLIC_BLOG_BASE_PATH=/blog`.
 * Today both are empty, so every URL is byte-identical to the origin-root output.
 *
 * Build absolute URLs with `absoluteUrl(path)` and root-relative paths with
 * `sitePath(path)` — never concatenate the origin with a raw path, or the
 * base path will be skipped under subpath hosting (PROD-1596).
 */
function readEnv(key: string): string {
  const v = process.env[key];
  return typeof v === "string" ? v.trim() : "";
}

function defaultLocalOrigin(): string {
  const port = process.env.PORT?.trim() || "3003";
  return `http://localhost:${port}`;
}

/** Default matches local `pnpm dev:blog`. */
const DEFAULT_SITE_URL = defaultLocalOrigin();

/** Normalize a base path: empty, or a single leading slash with no trailing slash. */
function normalizeBasePath(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed === "") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Blog path prefix. `''` today (origin-root / subdomain); set to `/blog` when the
 * blog is served as a subpath of the www app via Next.js multi-zones. Must match
 * `basePath` in `next.config.ts`. When set, `app/sitemap.ts` is served at
 * `/blog/sitemap.xml` automatically.
 */
export const BLOG_BASE_PATH = normalizeBasePath(
  readEnv("NEXT_PUBLIC_BLOG_BASE_PATH"),
);

/** Origin only (scheme + host), no path. Prefer `siteBaseUrl()` / `absoluteUrl()`. */
export function getSiteUrl(): string {
  return readEnv("NEXT_PUBLIC_SITE_URL") || DEFAULT_SITE_URL;
}

/** Main marketing site origin (organization entity, industry links). Not blog-prefixed. */
export function getWwwUrl(): string {
  return readEnv("NEXT_PUBLIC_WWW_URL") || "https://www.pakfactory.com";
}

export function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function withLeadingSlash(path: string): string {
  if (path === "" || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Root-relative blog path including the base prefix — for `<link>`/metadata `url`
 * fields that stay relative. `sitePath('/rss.xml')` → `/rss.xml` today, `/blog/rss.xml`
 * under subpath hosting. Do NOT use for `next/link` hrefs: `basePath` prefixes those.
 */
export function sitePath(path = "/"): string {
  return `${BLOG_BASE_PATH}${withLeadingSlash(path)}`;
}

/** Blog root as an absolute URL (no trailing slash): origin + base path. */
export function siteBaseUrl(): string {
  return `${normalizeSiteUrl(getSiteUrl())}${BLOG_BASE_PATH}`;
}

/**
 * Absolute blog URL for a root-relative path (canonicals, JSON-LD, RSS, sitemap).
 * `absoluteUrl('/trends/x')` → `https://origin/trends/x` today,
 * `https://origin/blog/trends/x` under subpath hosting.
 */
export function absoluteUrl(path = "/"): string {
  return `${siteBaseUrl()}${withLeadingSlash(path)}`;
}

/**
 * Absolute URL for the sitemap XSL stylesheet.
 *
 * Cannot use `absoluteUrl` here because `NEXT_PUBLIC_SITE_URL` may include a
 * path (e.g. `http://localhost:3003/blog` in local dev) even though `basePath`
 * is not set in `next.config.ts`. `URL.origin` strips any path component from
 * the env value so the XSL href always points to the actual served route:
 *   origin + BLOG_BASE_PATH + "/sitemap.xsl"
 */
export function sitemapXslUrl(): string {
  let origin: string;
  try {
    origin = new URL(getSiteUrl()).origin;
  } catch {
    origin = normalizeSiteUrl(getSiteUrl());
  }
  return `${origin}${sitePath("/sitemap.xsl")}`;
}
