import type {
    CustomizationFacetDef,
    CustomizationFacetOption,
    CustomizationLibraryItem,
    CustomizationLibraryResult,
} from '@/lib/catalog/types';
import {
    CUSTOMIZATION_PRODUCT_LINE_FACET_ID,
} from '@/lib/catalog/types';
import {compareCategorySlugs} from '@/lib/catalog/customization-category-order';
import {isSustainabilityProperty} from '@/lib/catalog/customization-filter-taxonomy';

function upsertOption(
    map: Map<string, CustomizationFacetOption>,
    value: string,
    label: string,
) {
    if (!map.has(value)) map.set(value, {value, label});
}

/**
 * Build tabs + facet catalog from mapped library items (client-filterable payload).
 */
export function buildCustomizationLibraryResult(
    items: CustomizationLibraryItem[],
): CustomizationLibraryResult {
    const tabMap = new Map<string, string>();
    const productLineOptions = new Map<string, CustomizationFacetOption>();
    const sustainabilityOptions = new Map<string, CustomizationFacetOption>();
    let sustainabilityFacetId = 'sustainability';
    let sustainabilityTitle = 'Sustainability';

    /** categorySlug → propertySlug → { title, options } */
    const categoryPropMaps = new Map<
        string,
        Map<
            string,
            {title: string; options: Map<string, CustomizationFacetOption>}
        >
    >();

    for (const item of items) {
        if (!tabMap.has(item.categoryValue)) {
            tabMap.set(
                item.categoryValue,
                item.categoryLabel ?? item.categoryValue,
            );
        }

        for (const line of item.productLines) {
            upsertOption(productLineOptions, line.slug, line.title);
        }

        for (const [propSlug, valueSlugs] of Object.entries(item.attrs)) {
            const propTitle =
                item.propertyTitles[propSlug] ?? labelFromSlug(propSlug);

            if (isSustainabilityProperty(propSlug, propTitle)) {
                sustainabilityFacetId = propSlug;
                sustainabilityTitle = propTitle;
                for (const vs of valueSlugs) {
                    upsertOption(
                        sustainabilityOptions,
                        vs,
                        item.valueTitles[vs] ?? labelFromSlug(vs),
                    );
                }
                continue;
            }

            let byProp = categoryPropMaps.get(item.categoryValue);
            if (!byProp) {
                byProp = new Map();
                categoryPropMaps.set(item.categoryValue, byProp);
            }
            let propEntry = byProp.get(propSlug);
            if (!propEntry) {
                propEntry = {title: propTitle, options: new Map()};
                byProp.set(propSlug, propEntry);
            } else if (propTitle) {
                propEntry.title = propTitle;
            }
            for (const vs of valueSlugs) {
                upsertOption(
                    propEntry.options,
                    vs,
                    item.valueTitles[vs] ?? labelFromSlug(vs),
                );
            }
        }
    }

    const shared: CustomizationFacetDef[] = [
        {
            id: CUSTOMIZATION_PRODUCT_LINE_FACET_ID,
            title: 'Product Line',
            options: [...productLineOptions.values()].sort((a, b) =>
                a.label.localeCompare(b.label),
            ),
        },
    ];

    if (sustainabilityOptions.size > 0) {
        shared.push({
            id: sustainabilityFacetId,
            title: sustainabilityTitle,
            options: [...sustainabilityOptions.values()].sort((a, b) =>
                a.label.localeCompare(b.label),
            ),
        });
    }

    const byCategory: Record<string, CustomizationFacetDef[]> = {};
    for (const [categorySlug, props] of categoryPropMaps) {
        const facets: CustomizationFacetDef[] = [];
        for (const [propSlug, entry] of props) {
            facets.push({
                id: propSlug,
                title: entry.title,
                options: [...entry.options.values()].sort((a, b) =>
                    a.label.localeCompare(b.label),
                ),
            });
        }
        facets.sort((a, b) => a.title.localeCompare(b.title));
        byCategory[categorySlug] = facets;
    }

    const tabs = [...tabMap.entries()]
        .map(([value, label]) => ({value, label}))
        .sort((a, b) => compareCategorySlugs(a.value, b.value));

    return {items, tabs, facetCatalog: {shared, byCategory}};
}

function labelFromSlug(slug: string): string {
    return slug
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
