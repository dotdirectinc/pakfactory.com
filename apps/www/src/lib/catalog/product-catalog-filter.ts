import type {
    CustomizationFacetDef,
    ProductLibraryItem,
} from '@/lib/catalog/types';
import {
    PRODUCT_CATALOG_INDUSTRY_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID,
} from '@/lib/catalog/types';
import {withinOpForFacet} from '@/lib/catalog/customization-filter-taxonomy';

export type ProductCatalogFilterInput = {
    query: string;
    selections: Record<string, string[]>;
};

function matchesFacet(
    item: ProductLibraryItem,
    facetId: string,
    selected: string[],
): boolean {
    if (facetId === PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID) {
        return selected.includes(item.productLine.slug);
    }
    if (facetId === PRODUCT_CATALOG_INDUSTRY_FACET_ID) {
        return selected.some((slug) =>
            item.industries.some((industry) => industry.slug === slug),
        );
    }
    const values = item.attrs[facetId] ?? [];
    const title = item.propertyTitles[facetId];
    if (withinOpForFacet(facetId, title) === 'and') {
        return selected.every((slug) => values.includes(slug));
    }
    return selected.some((slug) => values.includes(slug));
}

/** Whether an item carries a single facet option. */
export function productItemHasFacetValue(
    item: ProductLibraryItem,
    facetId: string,
    value: string,
): boolean {
    return matchesFacet(item, facetId, [value]);
}

/**
 * Whether a library product matches search and facet selections.
 *
 * Search is AND with facets. Active facet groups combine with AND across groups;
 * within a group: Sustainability and Performance are AND; Product Line, Industries,
 * and other properties are OR (same taxonomy as customizations).
 */
export function matchesProductItem(
    item: ProductLibraryItem,
    {query, selections}: ProductCatalogFilterInput,
): boolean {
    const q = query.trim().toLowerCase();
    if (q) {
        const haystack = [
            item.title,
            item.sku,
            item.productLine.title,
            item.productStyle.title,
        ]
            .join(' ')
            .toLowerCase();
        if (!haystack.includes(q)) return false;
    }

    const activeFacets = Object.entries(selections).filter(
        ([, selected]) => selected.length > 0,
    );
    if (activeFacets.length === 0) return true;

    return activeFacets.every(([facetId, selected]) =>
        matchesFacet(item, facetId, selected),
    );
}

/**
 * Disjunctive (except-self) facet counts: for facet F, count options against
 * items that match query + all selections except F.
 */
export function buildProductFacetCounts(
    items: ProductLibraryItem[],
    facets: CustomizationFacetDef[],
    {query, selections}: ProductCatalogFilterInput,
): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};

    for (const facet of facets) {
        const selectionsExcept = {...selections};
        delete selectionsExcept[facet.id];
        const base = items.filter((item) =>
            matchesProductItem(item, {query, selections: selectionsExcept}),
        );
        const counts: Record<string, number> = {};
        for (const opt of facet.options) {
            counts[opt.value] = base.filter((item) =>
                productItemHasFacetValue(item, facet.id, opt.value),
            ).length;
        }
        result[facet.id] = counts;
    }

    return result;
}
