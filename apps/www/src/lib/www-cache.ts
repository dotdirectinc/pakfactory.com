/**
 * Cache tags + TTLs for www Sanity reads (PROD-2456).
 * Webhook `/api/revalidate` must call `revalidateTag(tag, "max")` —
 * path revalidation alone does not bust `unstable_cache`.
 */

/** Safety-net TTL (seconds) between webhook misses. */
export const WWW_CONTENT_REVALIDATE_SECONDS = 300;

/** ISR floor for product / customization route segments. */
export const WWW_CATALOG_REVALIDATE_SECONDS = 60;

export const WWW_GLOBAL_SETTINGS_CACHE_TAG = 'www-global-settings';
export const WWW_FOOTER_CACHE_TAG = 'www-footer';
export const WWW_CATALOG_PRODUCTS_CACHE_TAG = 'www-catalog-products';
export const WWW_CATALOG_LINES_CACHE_TAG = 'www-catalog-lines';
export const WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG =
    'www-catalog-customizations';
export const WWW_SOLUTIONS_CACHE_TAG = 'www-solutions';

export const wwwProductTag = (slug: string) => `www-product:${slug}`;
export const wwwSolutionTag = (slug: string) => `www-solution:${slug}`;
