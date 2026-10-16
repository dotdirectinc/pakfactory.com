/**
 * Which Sanity `redirect` documents the www proxy applies: those whose `from` is
 * on a surface this app serves, so another app's pattern rules never match www
 * paths.
 *
 * - `/case-studies`: as before (a plain starts-with).
 * - The catalog (PROD-3098): a structure move approved in the Spec System changes
 *   a style's or option's URL and creates a redirect from the old path
 *   (pakfactory.com-server, PROD-3097). Matched on a whole path segment, so
 *   `/products` never claims `/products-guide`.
 */
const CASE_STUDIES_PREFIX = "/case-studies";
const CATALOG_SURFACES = ["/products", "/solutions", "/customizations"];

const onCatalog = (path: string) => CATALOG_SURFACES.some((p) => path === p || path.startsWith(`${p}/`));

export function isWwwRedirect(from: string): boolean {
    if (from.startsWith(CASE_STUDIES_PREFIX)) return true;
    return onCatalog(from);
}

/**
 * Where a redirect's destination is resolved. Case studies keep the site URL:
 * they reach this app through the live site's nginx, so the request's own host
 * is the origin host, not the one the visitor uses. Catalog paths are served by
 * this app itself, so a catalog destination stays on the host that was asked —
 * otherwise staging and previews redirect to the live site (found 2026-10-16:
 * staging's old solution style URL landed on pakfactory.com's 404).
 */
export function redirectBase(destination: string, requestOrigin: string, siteUrl: string): string {
    return destination.startsWith("/") && onCatalog(destination.split("?")[0]!) ? requestOrigin : siteUrl;
}
