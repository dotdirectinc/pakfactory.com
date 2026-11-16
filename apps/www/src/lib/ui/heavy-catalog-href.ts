import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * Catalog index (and compatibility) routes whose RSC payload is multi‑hundred
 * KB to multi‑MB. Viewport prefetch of these Links competes with LCP — keep
 * `prefetch={false}` until pointer/focus (see ENGINEERING.md pointer prefetch).
 */
const HEAVY_CATALOG_HREFS = new Set<string>([
    WWW_ROUTES.products,
    WWW_ROUTES.customizations,
    `${WWW_ROUTES.customizations}/compatibility`,
]);

/** True when `href` is exactly a heavy catalog index path (query/hash ignored). */
export function isHeavyCatalogHref(href: string): boolean {
    if (!href) return false;
    try {
        const path = href.startsWith('http')
            ? new URL(href).pathname
            : href.split('?')[0]?.split('#')[0] ?? href;
        const normalized =
            path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
        return HEAVY_CATALOG_HREFS.has(normalized);
    } catch {
        return false;
    }
}
