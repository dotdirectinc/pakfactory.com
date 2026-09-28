import {createFacetEngine} from '@/lib/catalog/facet-engine';
import type {
    CustomizationFacetDef,
    CustomizationLibraryItem,
} from '@/lib/catalog/types';
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

function engineForCategory(category: string) {
    return createFacetEngine<CustomizationLibraryItem>({
        getSearchText: (item) => item.title,
        matchesFacet,
        matchesContext: (item) =>
            category === CUSTOMIZATION_CATALOG_ALL_CATEGORY ||
            item.categoryValue === category,
    });
}

/** Whether an item carries a single facet option. */
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
    return engineForCategory(category).matchesItem(item, {query, selections});
}

/**
 * Disjunctive (except-self) facet counts: for facet F, count options against
 * items that match category + query + all selections except F.
 */
export function buildCustomizationFacetCounts(
    items: CustomizationLibraryItem[],
    facets: CustomizationFacetDef[],
    {category, query, selections}: CustomizationCatalogFilterInput,
): Record<string, Record<string, number>> {
    return engineForCategory(category).buildFacetCounts(items, facets, {
        query,
        selections,
    });
}
