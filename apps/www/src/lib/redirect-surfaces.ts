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

export function isWwwRedirect(from: string): boolean {
    if (from.startsWith(CASE_STUDIES_PREFIX)) return true;
    return CATALOG_SURFACES.some((p) => from === p || from.startsWith(`${p}/`));
}
