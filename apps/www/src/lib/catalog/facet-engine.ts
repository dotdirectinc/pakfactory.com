import type {CustomizationFacetDef} from '@/lib/catalog/types';

export type FacetEngineFilterInput = {
    query: string;
    selections: Record<string, string[]>;
};

export type FacetEngineConfig<TItem> = {
    /** Lowercased haystack for substring search. Empty query skips this. */
    getSearchText: (item: TItem) => string;
    /**
     * Whether the item matches an active facet group.
     * Caller applies within-group AND/OR; engine ANDs across groups.
     */
    matchesFacet: (
        item: TItem,
        facetId: string,
        selected: string[],
    ) => boolean;
    /**
     * Optional gate before facets (e.g. customization category).
     * Return false to exclude the item.
     */
    matchesContext?: (item: TItem, input: FacetEngineFilterInput) => boolean;
};

export type FacetEngine<TItem> = {
    matchesItem: (item: TItem, input: FacetEngineFilterInput) => boolean;
    itemHasFacetValue: (
        item: TItem,
        facetId: string,
        value: string,
    ) => boolean;
    buildFacetCounts: (
        items: TItem[],
        facets: CustomizationFacetDef[],
        input: FacetEngineFilterInput,
    ) => Record<string, Record<string, number>>;
};

/**
 * Pure catalog filter + disjunctive (except-self) facet counts.
 * Feature panels supply accessors; search and across-group AND live here.
 */
export function createFacetEngine<TItem>(
    config: FacetEngineConfig<TItem>,
): FacetEngine<TItem> {
    function matchesItem(
        item: TItem,
        input: FacetEngineFilterInput,
    ): boolean {
        if (config.matchesContext && !config.matchesContext(item, input)) {
            return false;
        }

        const q = input.query.trim().toLowerCase();
        if (q && !config.getSearchText(item).toLowerCase().includes(q)) {
            return false;
        }

        const activeFacets = Object.entries(input.selections).filter(
            ([, selected]) => selected.length > 0,
        );
        if (activeFacets.length === 0) return true;

        return activeFacets.every(([facetId, selected]) =>
            config.matchesFacet(item, facetId, selected),
        );
    }

    function itemHasFacetValue(
        item: TItem,
        facetId: string,
        value: string,
    ): boolean {
        return config.matchesFacet(item, facetId, [value]);
    }

    function buildFacetCounts(
        items: TItem[],
        facets: CustomizationFacetDef[],
        {query, selections}: FacetEngineFilterInput,
    ): Record<string, Record<string, number>> {
        const result: Record<string, Record<string, number>> = {};

        for (const facet of facets) {
            const selectionsExcept = {...selections};
            delete selectionsExcept[facet.id];
            const base = items.filter((item) =>
                matchesItem(item, {query, selections: selectionsExcept}),
            );
            const counts: Record<string, number> = {};
            for (const opt of facet.options) {
                counts[opt.value] = base.filter((item) =>
                    itemHasFacetValue(item, facet.id, opt.value),
                ).length;
            }
            result[facet.id] = counts;
        }

        return result;
    }

    return {matchesItem, itemHasFacetValue, buildFacetCounts};
}
