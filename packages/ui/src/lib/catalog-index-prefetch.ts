/**
 * Catalog index routes whose Next.js RSC payload is large enough that
 * viewport `Link` prefetch competes with LCP. Keep prefetch off until
 * pointer / focus (www uses `usePointerPrefetch` on tiles).
 */
export function shouldPrefetchCatalogHref(href: string): boolean {
  const path = (href.split("?")[0] ?? href).replace(/\/$/, "") || "/";
  return (
    path !== "/products" &&
    path !== "/customizations" &&
    path !== "/customizations/compatibility"
  );
}
