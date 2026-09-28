/**
 * Catalog / PDP SKU eyebrow. Missing or slug-as-SKU values render as "-".
 */
export function displayProductSku(
    sku: string | null | undefined,
    slug: string,
): string {
    const raw = sku?.trim() ?? '';
    const slugKey = slug.trim().toLowerCase();
    if (!raw || raw === '-' || raw.toLowerCase() === slugKey) {
        return '-';
    }
    return raw;
}
