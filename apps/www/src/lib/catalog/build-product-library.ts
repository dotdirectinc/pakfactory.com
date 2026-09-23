import type {
    CustomizationFacetDef,
    CustomizationFacetOption,
    ProductKind,
    ProductLibraryItem,
    ProductLibraryLineMeta,
    ProductLibraryResult,
} from '@/lib/catalog/types';
import {
    PRODUCT_CATALOG_INDUSTRY_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID,
    PRODUCT_CATALOG_PRODUCT_TYPE_FACET_ID,
} from '@/lib/catalog/types';
import {isSustainabilityProperty} from '@/lib/catalog/customization-filter-taxonomy';

const PRODUCT_TYPE_LABELS: Record<ProductKind, string> = {
    standard: 'Standard',
    inspiration: 'Inspiration',
};

const PRODUCT_TYPE_ORDER: ProductKind[] = ['standard', 'inspiration'];

function upsertOption(
    map: Map<string, CustomizationFacetOption>,
    value: string,
    label: string,
) {
    if (!map.has(value)) map.set(value, {value, label});
}

function labelFromSlug(slug: string): string {
    return slug
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function preferLineMeta(
    existing: ProductLibraryLineMeta | undefined,
    next: ProductLibraryLineMeta,
): ProductLibraryLineMeta {
    if (!existing) return next;
    return {
        ...existing,
        description: existing.description || next.description,
        imageUrl: existing.imageUrl || next.imageUrl,
        imageAlt: existing.imageAlt || next.imageAlt,
    };
}

/**
 * Build shared facet catalog + linesBySlug from mapped product library items
 * (no category tabs).
 */
export function buildProductLibraryResult(
    items: ProductLibraryItem[],
    lineMetas: ProductLibraryLineMeta[] = [],
    options?: {omitFacetIds?: string[]},
): ProductLibraryResult {
    const omit = new Set(options?.omitFacetIds ?? []);
    const productLineOptions = new Map<string, CustomizationFacetOption>();
    const productTypeKinds = new Set<ProductKind>();
    const industryOptions = new Map<string, CustomizationFacetOption>();
    const sustainabilityOptions = new Map<string, CustomizationFacetOption>();
    const linesBySlug: Record<string, ProductLibraryLineMeta> = {};
    let sustainabilityFacetId = 'sustainability';
    let sustainabilityTitle = 'Sustainability';

    for (const meta of lineMetas) {
        linesBySlug[meta.slug] = preferLineMeta(
            linesBySlug[meta.slug],
            meta,
        );
    }

    for (const item of items) {
        const lineSlug = item.productLine.slug;
        upsertOption(
            productLineOptions,
            lineSlug,
            item.productLine.title,
        );
        productTypeKinds.add(item.kind);

        if (!linesBySlug[lineSlug]) {
            linesBySlug[lineSlug] = {
                slug: lineSlug,
                title: item.productLine.title,
            };
        }

        // Prefer line cardImage; fill gaps from the first product that has media.
        const lineMeta = linesBySlug[lineSlug];
        if (!lineMeta.imageUrl && item.imageUrl) {
            linesBySlug[lineSlug] = {
                ...lineMeta,
                imageUrl: item.imageUrl,
                imageAlt: item.imageAlt ?? item.title,
            };
        }

        for (const industry of item.industries) {
            upsertOption(industryOptions, industry.slug, industry.title);
        }

        for (const [propSlug, valueSlugs] of Object.entries(item.attrs)) {
            const propTitle =
                item.propertyTitles[propSlug] ?? labelFromSlug(propSlug);

            if (!isSustainabilityProperty(propSlug, propTitle)) continue;

            sustainabilityFacetId = propSlug;
            sustainabilityTitle = propTitle;
            for (const vs of valueSlugs) {
                upsertOption(
                    sustainabilityOptions,
                    vs,
                    item.valueTitles[vs] ?? labelFromSlug(vs),
                );
            }
        }
    }

    const shared: CustomizationFacetDef[] = [];

    if (
        productTypeKinds.size > 0 &&
        !omit.has(PRODUCT_CATALOG_PRODUCT_TYPE_FACET_ID)
    ) {
        shared.push({
            id: PRODUCT_CATALOG_PRODUCT_TYPE_FACET_ID,
            title: 'Product type',
            options: PRODUCT_TYPE_ORDER.filter((kind) =>
                productTypeKinds.has(kind),
            ).map((kind) => ({
                value: kind,
                label: PRODUCT_TYPE_LABELS[kind],
            })),
        });
    }

    shared.push({
        id: PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID,
        title: 'Product Line',
        options: [...productLineOptions.values()].sort((a, b) =>
            a.label.localeCompare(b.label),
        ),
    });

    if (
        industryOptions.size > 0 &&
        !omit.has(PRODUCT_CATALOG_INDUSTRY_FACET_ID)
    ) {
        shared.push({
            id: PRODUCT_CATALOG_INDUSTRY_FACET_ID,
            title: 'Industries',
            options: [...industryOptions.values()].sort((a, b) =>
                a.label.localeCompare(b.label),
            ),
        });
    }

    if (
        sustainabilityOptions.size > 0 &&
        !omit.has(sustainabilityFacetId)
    ) {
        shared.push({
            id: sustainabilityFacetId,
            title: sustainabilityTitle,
            options: [...sustainabilityOptions.values()].sort((a, b) =>
                a.label.localeCompare(b.label),
            ),
        });
    }

    return {items, linesBySlug, facetCatalog: {shared}};
}
