/**
 * Runtime-agnostic core for CMS redirect resolution — no `server-only`,
 * `next/cache`, or `@sanity/client` imports, so it runs in **both** the edge
 * middleware (which resolves redirects before any route matches) and the RSC
 * fallback in `blog-redirects.ts`.
 *
 * Why a middleware at all: legacy `from` paths are often intercepted by a
 * more-specific route before a page-level redirect check can run —
 * `/{cat}/{postSlug}` strips to `/{postSlug}`, `/author/{x}` renders a profile,
 * `/tag/{x}` hits a config rewrite. Middleware runs first and catches every
 * shape (PROD-2154).
 */

export type RedirectRow = { from?: string; to?: string; type?: string };

/** Resolved target. `destination` is a PUBLIC path (keeps `/blog`/`/case-studies`) or an absolute URL. */
export type ResolvedRedirect = { destination: string; permanent: boolean };
export type RedirectMap = Record<string, ResolvedRedirect>;

const isAbsolute = (s: string): boolean => /^https?:\/\//i.test(s);

/** Leading slash, no trailing slash (except root). Mirrors how paths are stored/served. */
export function normalizePath(path: string): string {
  const withLead = path.startsWith("/") ? path : `/${path}`;
  const trimmed = withLead.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * App-internal (base-path-less) form of a public path. Editors author redirects
 * as public URLs that include the `/blog` base path (`/blog/old-post/`), but the
 * app matches base-path-less pathnames — so both `from` matching and chain
 * following key off the stripped form.
 */
export function stripBasePath(path: string, basePath: string): string {
  if (!basePath) return path;
  if (path === basePath || path === `${basePath}/`) return "/";
  return path.startsWith(`${basePath}/`) ? path.slice(basePath.length) : path;
}

/** Absolute redirect URL. Internal targets are joined to the site origin so the base path is never double-prepended (fixes cross-app `/case-studies` targets). */
export function toAbsolute(destination: string, siteUrl: string): string {
  if (isAbsolute(destination)) return destination;
  return `${siteUrl.replace(/\/$/, "")}${destination.startsWith("/") ? "" : "/"}${destination}`;
}

/**
 * Build the `strippedFrom → {publicDestination, permanent}` map.
 * - `from` key: base-path-less, normalized.
 * - `destination`: the PUBLIC `to` (keeps its `/blog` or `/case-studies` prefix),
 *   normalized (trailing slash dropped → one fewer hop), or an absolute URL as-is.
 * - Self-referential docs (from ≡ to after normalization) are skipped — they'd loop.
 */
export function buildRedirectMap(
  rows: RedirectRow[],
  basePath: string,
): RedirectMap {
  const map: RedirectMap = {};
  for (const row of rows) {
    if (!row?.from || !row?.to) continue;
    const fromKey = normalizePath(stripBasePath(row.from, basePath));
    const destination = isAbsolute(row.to) ? row.to : normalizePath(row.to);
    const destKey = isAbsolute(destination)
      ? destination
      : normalizePath(stripBasePath(destination, basePath));
    if (destKey === fromKey) continue; // self-referential → skip (avoids loops)
    map[fromKey] = { destination, permanent: row.type !== "302" };
  }
  return map;
}

/**
 * Resolve a redirect for `pathname` (as the app sees it — base-path-less).
 * Follows internal chains up to `maxHops` with a loop guard; degrades to a
 * temporary redirect if any hop is temporary. Returns null on no match.
 */
export function resolveInMap(
  map: RedirectMap,
  pathname: string,
  basePath: string,
  maxHops = 5,
): ResolvedRedirect | null {
  let key = normalizePath(stripBasePath(pathname, basePath));
  const seen = new Set<string>();
  let result: ResolvedRedirect | null = null;
  let permanent = true;

  for (let i = 0; i < maxHops; i++) {
    if (seen.has(key)) break;
    seen.add(key);
    const hit = map[key];
    if (!hit) break;
    permanent = permanent && hit.permanent;
    result = { destination: hit.destination, permanent };
    if (isAbsolute(hit.destination)) break; // external target — stop following
    const nextKey = normalizePath(stripBasePath(hit.destination, basePath));
    if (nextKey === key || !map[nextKey]) break;
    key = nextKey;
  }
  return result;
}
