/**
 * Path-style pagination helpers shared by www/blog listings.
 * Page ≤ 1 stays on the base path; page ≥ 2 uses `/base/page/n`.
 */

const PAGINATION_SCROLL_INTENT_KEY = "pagination-scroll-intent";

/** Normalize base path: leading slash, no trailing slash. */
function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === "/") return "";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, "");
}

/**
 * Build the listing URL for a 1-based page number.
 * `pathPaginationHref('/case-studies', 1)` → `/case-studies`
 * `pathPaginationHref('/case-studies', 2)` → `/case-studies/page/2`
 */
export function pathPaginationHref(basePath: string, page: number): string {
  const base = normalizeBasePath(basePath);
  if (page <= 1) return base || "/";
  return `${base}/page/${page}`;
}

/**
 * Read the page number from a pathname under `basePath`.
 * Returns `1` for the base path, `n` for `/base/page/n`, or `null` if unrelated.
 */
export function parsePathPage(
  pathname: string,
  basePath: string,
): number | null {
  const base = normalizeBasePath(basePath);
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";

  if (path === base || path === `${base}/`) return 1;

  const prefix = `${base}/page/`;
  if (!path.startsWith(prefix)) return null;

  const raw = path.slice(prefix.length);
  if (!/^[1-9]\d*$/.test(raw)) return null;
  return Number(raw);
}

/** Smooth-scroll a listing anchor into view (blog/www shared). */
export function scrollToPaginationTarget(targetId: string): void {
  if (typeof document === "undefined") return;
  document
    .getElementById(targetId)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Mark that the next listing render should scroll (Link-based pagination). */
export function setPaginationScrollIntent(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PAGINATION_SCROLL_INTENT_KEY, "1");
}

/** Consume and clear scroll intent; returns whether a scroll should run. */
export function consumePaginationScrollIntent(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(PAGINATION_SCROLL_INTENT_KEY) !== "1") return false;
  sessionStorage.removeItem(PAGINATION_SCROLL_INTENT_KEY);
  return true;
}
