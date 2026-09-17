import type {CustomizationLibraryItem} from '@/lib/catalog/types';
import {CUSTOMIZATION_PRODUCT_LINE_FACET_ID} from '@/lib/catalog/types';
import {withinOpForFacet} from '@/lib/catalog/customization-filter-taxonomy';

/** Category tab value for “all categories”. */
export const CUSTOMIZATION_CATALOG_ALL_CATEGORY = 'all';

export type CustomizationCatalogFilterInput = {
    category: string;
    query: string;
    selections: Record<string, string[]>;
};

function matchesFacet(
    item: CustomizationLibraryItem,
    facetId: string,
    selected: string[],
): boolean {
    if (facetId === CUSTOMIZATION_PRODUCT_LINE_FACET_ID) {
        return selected.some((slug) =>
            item.productLines.some((line) => line.slug === slug),
        );
    }
    const values = item.attrs[facetId] ?? [];
    const title = item.propertyTitles[facetId];
    // Within-group: Sustainability + Performance AND; others OR (taxonomy §2).
    if (withinOpForFacet(facetId, title) === 'and') {
        return selected.every((slug) => values.includes(slug));
    }
    return selected.some((slug) => values.includes(slug));
}

/** Whether an item carries a single facet option (for result-set distribution counts). */
export function itemHasFacetValue(
    item: CustomizationLibraryItem,
    facetId: string,
    value: string,
): boolean {
    return matchesFacet(item, facetId, [value]);
}

/**
 * Whether a library item matches category, search, and facet selections.
 *
 * Category + search are AND. Active facet groups combine with AND across groups
 * (taxonomy §2). Within a group: Sustainability and Performance are AND; Product
 * Line and other properties are OR.
 */
export function matchesCustomizationItem(
    item: CustomizationLibraryItem,
    {category, query, selections}: CustomizationCatalogFilterInput,
): boolean {
    if (
        category !== CUSTOMIZATION_CATALOG_ALL_CATEGORY &&
        item.categoryValue !== category
    ) {
        return false;
    }
    const q = query.trim().toLowerCase();
    if (q && !item.title.toLowerCase().includes(q)) return false;

    const activeFacets = Object.entries(selections).filter(
        ([, selected]) => selected.length > 0,
    );
    if (activeFacets.length === 0) return true;

    return activeFacets.every(([facetId, selected]) =>
        matchesFacet(item, facetId, selected),
    );
}
