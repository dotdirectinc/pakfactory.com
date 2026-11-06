import {createFacetEngine} from '@/lib/catalog/facet-engine';
import type {
    CustomizationFacetDef,
    ProductLibraryItem,
} from '@/lib/catalog/types';
import {
    PRODUCT_CATALOG_INDUSTRY_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_TYPE_FACET_ID,
    membershipStyles,
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
    propertyTitles: Record<string, string>,
): boolean {
    if (facetId === PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID) {
        return selected.includes(item.productLine.slug);
    }
    if (facetId === PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID) {
        // Union membership — any linked style (PROD-2843), not primary only.
        return selected.some((slug) =>
            membershipStyles(item).some((style) => style.slug === slug),
        );
    }
    if (facetId === PRODUCT_CATALOG_PRODUCT_TYPE_FACET_ID) {
        return selected.includes(item.kind);
    }
    if (facetId === PRODUCT_CATALOG_INDUSTRY_FACET_ID) {
        return selected.some((slug) =>
            item.industries.some((industry) => industry.slug === slug),
        );
    }
    const values = item.attrs[facetId] ?? [];
    const title = propertyTitles[facetId];
    if (withinOpForFacet(facetId, title) === 'and') {
        return selected.every((slug) => values.includes(slug));
    }
    return selected.some((slug) => values.includes(slug));
}

function createProductFacetEngine(propertyTitles: Record<string, string>) {
    return createFacetEngine<ProductLibraryItem>({
        getSearchText: (item) =>
            [
                item.title,
                item.sku,
                item.productLine.title,
                item.productStyle.title,
                ...membershipStyles(item).map((style) => style.title),
            ].join(' '),
        matchesFacet: (item, facetId, selected) =>
            matchesFacet(item, facetId, selected, propertyTitles),
    });
}

const defaultEngine = createProductFacetEngine({});

/** Whether an item carries a single facet option. */
export function productItemHasFacetValue(
    item: ProductLibraryItem,
    facetId: string,
    value: string,
    propertyTitles: Record<string, string> = {},
): boolean {
    return createProductFacetEngine(propertyTitles).itemHasFacetValue(
        item,
        facetId,
        value,
    );
}

/**
 * Whether a library product matches search and facet selections.
 *
 * Search is AND with facets. Active facet groups combine with AND across groups;
 * within a group: Sustainability and Performance are AND; Product Line, Product
 * Style, Product type, Industries, and other properties are OR.
 */
export function matchesProductItem(
    item: ProductLibraryItem,
    input: ProductCatalogFilterInput,
    propertyTitles: Record<string, string> = {},
): boolean {
    return createProductFacetEngine(propertyTitles).matchesItem(item, input);
}

/**
 * The pre-configured options of a product that contain the search text — the same
 * case-insensitive substring match as the main search (PROD-3296). Empty when none
 * do or the query is empty.
 */
export function preconfiguredMatches(
    item: Pick<ProductLibraryItem, 'preconfigured'>,
    query: string,
): string[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (item.preconfigured ?? []).filter((title) => title.toLowerCase().includes(q));
}

/**
 * A product the search finds ONLY through an option it arrives with (PROD-3296):
 * not a direct match, but one of its pre-configured options contains the query,
 * and it passes every active filter. These show in their own group below the
 * direct matches; the header count and facet counts stay on direct matches.
 */
export function matchesProductItemViaCustomization(
    item: ProductLibraryItem,
    input: ProductCatalogFilterInput,
    propertyTitles: Record<string, string> = {},
): boolean {
    if (!input.query.trim()) return false;
    const engine = createProductFacetEngine(propertyTitles);
    if (engine.matchesItem(item, input)) return false;
    if (preconfiguredMatches(item, input.query).length === 0) return false;
    return engine.matchesItem(item, {query: '', selections: input.selections});
}

/**
 * Disjunctive (except-self) facet counts: for facet F, count options against
 * items that match query + all selections except F.
 */
export function buildProductFacetCounts(
    items: ProductLibraryItem[],
    facets: CustomizationFacetDef[],
    input: ProductCatalogFilterInput,
    propertyTitles: Record<string, string> = {},
): Record<string, Record<string, number>> {
    return createProductFacetEngine(propertyTitles).buildFacetCounts(
        items,
        facets,
        input,
    );
}

/** Default engine export for callers that already hoist titles onto facets. */
export {defaultEngine as productFacetEngine};
