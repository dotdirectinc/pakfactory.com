/**
 * Assemble the compatibility page model from URL + offer index (PROD-2921).
 */

import {matchCompatibility} from '@/lib/catalog/compatibility';
import {
    assertCompatibilityCategorySlugs,
    serializeCompatibilityQuery,
    type CompatibilityQuery,
} from '@/lib/catalog/compatibility-query';
import type {ProductOfferIndex} from '@/lib/catalog/product-offer-index';
import {resolveCompatibilitySelections} from '@/lib/catalog/resolve-compatibility-selections';
import {buildProductLibraryResult} from '@/lib/catalog/build-product-library';
import type {
    CustomizationLibraryResult,
    ProductLibraryItem,
    ProductLibraryResult,
} from '@/lib/catalog/types';

export type CompatibilityPartialCardMeta = {
    productId: string;
    matchedCount: number;
    totalCount: number;
    note: string;
    badge: string;
};

export type CompatibilityHeroMediaItem = {
    /** Primary still URL; null when the option has no image (hero shows a placeholder). */
    src: string | null;
    alt: string;
};

export type CompatibilityPageModel = {
    query: CompatibilityQuery;
    queryString: string;
    /** Engine URL query (always canonical, never path-scoped). For Copy link. */
    engineQueryString: string;
    heading: string;
    subline: string | null;
    notices: string[];
    library: ProductLibraryResult;
    /** Full-match (ALL-OF) product ids — same set as `library.items`. */
    fullIds: string[];
    /** Unused for the grid (ALL-OF only); kept for callers / future UI. */
    partialMeta: Map<string, CompatibilityPartialCardMeta>;
    selectedTitles: string[];
    selectedCount: number;
    optionTitlesById: Map<string, string>;
    /** Library items for the category picker. */
    pickerItems: CustomizationLibraryResult['items'];
    /** Primary stills for selected options (ADR-024 image 0), selection order. */
    heroMedia: CompatibilityHeroMediaItem[];
};

export function searchParamsFromRecord(
    raw: Record<string, string | string[] | undefined>,
): URLSearchParams {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(raw)) {
        if (value == null) continue;
        if (Array.isArray(value)) {
            for (const item of value) params.append(key, item);
        } else {
            params.set(key, value);
        }
    }
    return params;
}

export function buildCompatibilityPageModel(input: {
    query: CompatibilityQuery;
    pathSelection?: {category: string; optionSlug: string};
    productLibrary: ProductLibraryResult;
    customizationLibrary: CustomizationLibraryResult;
    offerIndex: ProductOfferIndex;
}): CompatibilityPageModel {
    const categorySlugs = [
        ...new Set(
            input.customizationLibrary.items.map((item) => item.categoryValue),
        ),
    ];
    assertCompatibilityCategorySlugs(categorySlugs);

    const resolved = resolveCompatibilitySelections(
        input.query,
        input.customizationLibrary.items,
        input.offerIndex.rules,
    );

    const notices: string[] = [];
    for (const unknown of resolved.unknownSelections) {
        const label = unknown.optionSlug || 'selection';
        notices.push(
            `${label} is no longer available and was removed from this view.`,
        );
    }
    for (const prop of resolved.properties) {
        for (const value of prop.droppedValueSlugs) {
            notices.push(
                `${value} is no longer available and was removed from this view.`,
            );
        }
    }
    for (const prop of resolved.unknownProperties) {
        notices.push(
            `${prop.propertyKey} could not be applied and was removed from this view.`,
        );
    }

    const canonicalQuery: CompatibilityQuery = {
        selections: resolved.selected.map((s) => ({
            category: s.category,
            optionSlug: s.optionSlug,
        })),
        properties: resolved.properties
            .filter((p) => p.keptValueSlugs.length > 0)
            .map((p) => ({
                category: p.category,
                optionSlug: p.optionSlug,
                propertyKey: p.propertyKey,
                valueSlugs: p.keptValueSlugs,
            })),
        ...(input.query.variant ? {variant: input.query.variant} : {}),
    };
    const queryString = serializeCompatibilityQuery(canonicalQuery, {
        pathSelection: input.pathSelection,
    });
    const engineQueryString = serializeCompatibilityQuery(canonicalQuery);

    const match = matchCompatibility(
        input.offerIndex.entries.map((entry) => ({
            productId: entry.productId,
            baseOfferIds: entry.baseOfferIds,
            rulesProduct: entry.rulesProduct
                ? {
                      _id: entry.productId,
                      availableCustomizations: (
                          entry.rulesProduct.available ?? []
                      )
                          .filter((id): id is string => Boolean(id))
                          .map((optionId) => ({optionId})),
                      customizationExceptions: (
                          entry.rulesProduct.exceptions ?? []
                      )
                          .filter(
                              (
                                  e,
                              ): e is {
                                  optionId: string;
                                  mode: 'add' | 'remove';
                                  reason?: string | null;
                              } =>
                                  Boolean(e?.optionId) &&
                                  (e?.mode === 'add' || e?.mode === 'remove'),
                          )
                          .map((e) => ({
                              optionId: e.optionId,
                              mode: e.mode,
                              ...(e.reason ? {reason: e.reason} : {}),
                          })),
                  }
                : undefined,
        })),
        resolved.selected,
        {
            unknownSelections: resolved.unknownSelections,
            rules: input.offerIndex.hasRules
                ? {
                      catalog: input.offerIndex.rules!.catalog,
                      graph: input.offerIndex.rules!.graph,
                  }
                : null,
        },
    );

    const optionTitlesById = new Map(
        resolved.selected.map((s) => [s.optionId, s.title]),
    );
    // Grid is ALL-OF only: every selected option must be offered (and survive
    // rules). Close / partial matches stay out of the catalog.
    const fullIdList = match.full.map((row) => row.productId);
    const partialMeta = new Map<string, CompatibilityPartialCardMeta>();
    const byId = new Map(
        input.productLibrary.items.map((item) => [item._id, item]),
    );
    const items: ProductLibraryItem[] = fullIdList
        .map((id) => byId.get(id))
        .filter((item): item is ProductLibraryItem => Boolean(item));

    const library = buildProductLibraryResult(
        items,
        Object.values(input.productLibrary.linesBySlug),
        {propertyTitles: input.productLibrary.propertyTitles},
    );

    const selectedTitles = resolved.selected.map((s) => s.title);
    const selectedCount = resolved.selected.length;
    const heading =
        selectedCount === 0
            ? 'Compatible products'
            : selectedCount === 1
              ? `Products compatible with ${selectedTitles[0]}`
              : `Products compatible with ${selectedTitles.join(', ')}`;
    const subline =
        selectedCount > 1
            ? `Supports all ${selectedCount} selected customizations`
            : null;

    const libraryByKey = new Map(
        input.customizationLibrary.items.map((item) => [
            `${item.categoryValue}\0${item.slug}`,
            item,
        ]),
    );
    const heroMedia: CompatibilityHeroMediaItem[] = [];
    for (const sel of canonicalQuery.selections) {
        const item = libraryByKey.get(`${sel.category}\0${sel.optionSlug}`);
        const title = item?.title ?? sel.optionSlug;
        const src =
            (item?.featuredImageUrl ?? item?.imageUrl)?.trim() || null;
        heroMedia.push({
            src,
            alt: item?.featuredImageAlt ?? item?.imageAlt ?? title,
        });
    }

    return {
        query: canonicalQuery,
        queryString,
        engineQueryString,
        heading,
        subline,
        notices,
        library,
        fullIds: fullIdList,
        partialMeta,
        selectedTitles,
        selectedCount,
        optionTitlesById,
        pickerItems: input.customizationLibrary.items,
        heroMedia,
    };
}
