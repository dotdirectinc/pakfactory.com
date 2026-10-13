/**
 * Hero, SEO, and catalog UI copy for `/products` and `/customizations`
 * (PROD-3001). Blank Sanity fields fall back to these constants.
 */

export type CatalogPageCopySource = {
    h1?: string | null;
    intro?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    searchPlaceholder?: string | null;
    emptyMessage?: string | null;
    resetLabel?: string | null;
    productLineFacetLabel?: string | null;
    categoryHint?: string | null;
};

export type ResolvedCatalogPageCopy = {
    h1: string;
    intro: string;
    metaTitle: string;
    metaDescription: string;
    searchPlaceholder: string;
    emptyMessage: string;
    resetLabel: string;
    productLineFacetLabel: string;
    categoryHint: string;
};

/** Crystal’s draft for `/customizations` until Studio is filled. */
export const CUSTOMIZATION_CATALOG_COPY_FALLBACKS: ResolvedCatalogPageCopy = {
    h1: 'Customization Library',
    intro:
        'Explore materials, finishes, printing techniques, and additional features for custom packaging. Learn how each option works and how it shapes your packaging’s look, feel, and functionality.',
    metaTitle: 'Packaging Customization Library | PakFactory',
    metaDescription:
        'Explore 200+ packaging materials, finishes, printing techniques, and add-ons. Learn what each option does and find the right fit for your custom packaging.',
    searchPlaceholder: 'Search options',
    emptyMessage:
        'No matching options found. Try a different search term or clear your filters to explore more options.',
    resetLabel: 'Clear All',
    productLineFacetLabel: 'Compatible Products',
    categoryHint:
        'Select a category above to filter by type, properties, and more.',
};

/** Current `/products` route copy — reseeded onto productCatalogPage. */
export const PRODUCT_CATALOG_COPY_FALLBACKS: ResolvedCatalogPageCopy = {
    h1: 'Products',
    intro: 'Custom packaging solutions tailored to your brand.',
    metaTitle: 'Products',
    metaDescription: 'Browse packaging products and styles.',
    searchPlaceholder: 'Search products',
    emptyMessage:
        'No products match these filters. Reset or broaden search.',
    resetLabel: 'Reset Filter',
    productLineFacetLabel: 'Product Line',
    categoryHint: '',
};

function pick(
    value: string | null | undefined,
    fallback: string,
): string {
    const trimmed = value?.trim();
    return trimmed || fallback;
}

export function resolveCatalogPageCopy(
    source: CatalogPageCopySource | null | undefined,
    fallbacks: ResolvedCatalogPageCopy,
): ResolvedCatalogPageCopy {
    return {
        h1: pick(source?.h1, fallbacks.h1),
        intro: pick(source?.intro, fallbacks.intro),
        metaTitle: pick(source?.metaTitle, fallbacks.metaTitle),
        metaDescription: pick(
            source?.metaDescription,
            fallbacks.metaDescription,
        ),
        searchPlaceholder: pick(
            source?.searchPlaceholder,
            fallbacks.searchPlaceholder,
        ),
        emptyMessage: pick(source?.emptyMessage, fallbacks.emptyMessage),
        resetLabel: pick(source?.resetLabel, fallbacks.resetLabel),
        productLineFacetLabel: pick(
            source?.productLineFacetLabel,
            fallbacks.productLineFacetLabel,
        ),
        categoryHint: pick(source?.categoryHint, fallbacks.categoryHint),
    };
}
