import 'server-only';

import {unstable_cache} from 'next/cache';
import {
    CATALOG_CUSTOMIZATION_BY_CATEGORY_HANDLE_QUERY,
    CATALOG_CUSTOMIZATION_DETAIL_QUERY,
    CATALOG_CUSTOMIZATION_LIBRARY_QUERY,
    CATALOG_CUSTOMIZATION_RULES_QUERY,
    CATALOG_OPTION_BY_ID_QUERY,
    CATALOG_PRODUCT_BY_SLUG_QUERY,
    CATALOG_PRODUCT_LIBRARY_QUERY,
    CATALOG_PRODUCT_LINES_QUERY,
    CATALOG_PRODUCTS_QUERY,
    type CatalogCustomizationDetailDoc,
    type CatalogCustomizationRulesDoc,
    type CatalogLibraryOptionDoc,
    type CatalogOptionDoc,
    type CatalogProductDoc,
    type CatalogProductLibraryDoc,
    type CatalogProductLineDoc,
} from '@pakfactory/sanity/queries';
import {buildCustomizationLibraryResult} from '@/lib/catalog/build-customization-library';
import {buildProductLibraryResult} from '@/lib/catalog/build-product-library';
import {
    prepareRules,
    resolveProductCustomizations,
    type PreparedRules,
} from '@/lib/catalog/customization-rules';
import {
    mapSanityCustomizationDetail,
    mapSanityLibraryOption,
    mapSanityOptionDoc,
    mapSanityProduct,
    mapSanityProductLibraryItem,
    mapSanityProductLibraryLineMeta,
    mapSanityProductLine,
} from '@/lib/catalog/map-sanity';
import type {
    CustomizationDetail,
    CustomizationDetailResult,
    CustomizationLibraryItem,
    CustomizationLibraryResult,
    CustomizationOption,
    Product,
    ProductLibraryItem,
    ProductLibraryLineMeta,
    ProductLibraryResult,
    ProductLine,
    ProductStyleRef,
    ProductsSegmentResult,
} from '@/lib/catalog/types';
import {
    draftAwareClient,
    readThrough,
} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
    WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG,
    WWW_CATALOG_LINES_CACHE_TAG,
    WWW_CATALOG_PRODUCTS_CACHE_TAG,
    WWW_CONTENT_REVALIDATE_SECONDS,
    wwwProductTag,
} from '@/lib/www-cache';

function normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
}

async function fetchSanityProducts(): Promise<Product[]> {
    if (!isSanityConfigured()) return [];
    try {
        const docs = await (await draftAwareClient()).fetch<CatalogProductDoc[]>(
            CATALOG_PRODUCTS_QUERY,
        );
        return (docs ?? [])
            .map(mapSanityProduct)
            .filter((item): item is Product => item != null);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity products fetch failed:', err);
        }
        return [];
    }
}

async function fetchSanityLines(): Promise<ProductLine[]> {
    if (!isSanityConfigured()) return [];
    try {
        const docs = await (await draftAwareClient()).fetch<
            CatalogProductLineDoc[]
        >(CATALOG_PRODUCT_LINES_QUERY);
        return (docs ?? [])
            .map(mapSanityProductLine)
            .filter((item): item is ProductLine => item != null)
            .filter(
                (line) => line.products.length > 0 || line.styles.length > 0,
            );
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity product lines fetch failed:', err);
        }
        return [];
    }
}

/**
 * The customization rules catalog (PROD-2556): every type and active option with their
 * relationships — about 1 MB, fetched once and cached, never sent to the browser whole.
 */
async function fetchCustomizationRules(): Promise<CatalogCustomizationRulesDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (await draftAwareClient()).fetch<CatalogCustomizationRulesDoc>(
            CATALOG_CUSTOMIZATION_RULES_QUERY,
        );
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity customization rules fetch failed:', err);
        }
        return null;
    }
}

const getCachedCustomizationRules = unstable_cache(
    fetchCustomizationRules,
    [`${WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG}:rules`],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
    },
);

let rulesNotReadyLogged = false;

async function getPreparedRules(): Promise<PreparedRules | null> {
    const doc = await readThrough(fetchCustomizationRules, getCachedCustomizationRules);
    const prepared = prepareRules(doc);
    if (!prepared && doc && !rulesNotReadyLogged) {
        rulesNotReadyLogged = true;
        console.warn(
            '[catalog] This dataset has no customization rules yet (no compatibleCustomizations / dependsOn). Showing each product\'s own customizations only.',
        );
    }
    return prepared;
}

/**
 * What the product offers, from the shared rules: its own list, everything derived from it,
 * its exceptions applied — and for a preset, all of that from its `basedOn` product. Without
 * rules in the dataset, the product's own list stands (see `prepareRules`).
 */
async function resolveProductOffer(
    product: Product,
    doc: CatalogProductDoc,
): Promise<Product> {
    const rules = await getPreparedRules();
    if (!rules) return product;
    const resolved = resolveProductCustomizations(
        rules,
        {rulesProduct: doc.rulesProduct, preselectedIds: doc.preselectedIds, productId: doc._id},
        (option, preselected) => mapSanityOptionDoc(option, preselected),
    );
    return {
        ...product,
        availableCustomizations: resolved.availableCustomizations,
        customizationRules: resolved.customizationRules,
    };
}

async function fetchSanityProduct(slug: string): Promise<Product | null> {
    if (!isSanityConfigured()) return null;
    try {
        const doc = await (await draftAwareClient()).fetch<CatalogProductDoc | null>(
            CATALOG_PRODUCT_BY_SLUG_QUERY,
            {slug: normalizeSlug(slug)},
        );
        if (!doc) return null;
        const mapped = mapSanityProduct(doc);
        if (!mapped) return null;
        const resolved = await resolveProductOffer(mapped, doc);
        return enrichRelatedProducts(resolved);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity product by slug failed:', err);
        }
        return null;
    }
}

const RELATED_PRODUCTS_CAP = 6;

/** Curated related first; else same product-line siblings (PROD-1913). */
async function enrichRelatedProducts(product: Product): Promise<Product> {
    if (product.relatedProducts && product.relatedProducts.length > 0) {
        return product;
    }
    const lineSlug = product.productLine.slug;
    const siblings = (await listProducts())
        .filter(
            (item) =>
                item.slug !== product.slug &&
                item.productLine.slug === lineSlug,
        )
        .slice(0, RELATED_PRODUCTS_CAP);
    if (siblings.length === 0) return product;
    return {...product, relatedProducts: siblings};
}

async function fetchSanityCustomizationLibrary(): Promise<
    CustomizationLibraryResult
> {
    if (!isSanityConfigured()) {
        return {items: [], tabs: [], facetCatalog: {shared: [], byCategory: {}}};
    }
    try {
        const docs = await (await draftAwareClient()).fetch<
            CatalogLibraryOptionDoc[]
        >(CATALOG_CUSTOMIZATION_LIBRARY_QUERY);
        const items = (docs ?? [])
            .map(mapSanityLibraryOption)
            .filter((item): item is CustomizationLibraryItem => item != null);
        return buildCustomizationLibraryResult(items);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity customization library failed:', err);
        }
        return {items: [], tabs: [], facetCatalog: {shared: [], byCategory: {}}};
    }
}

async function fetchSanityProductLibrary(): Promise<ProductLibraryResult> {
    if (!isSanityConfigured()) {
        return {items: [], linesBySlug: {}, facetCatalog: {shared: []}};
    }
    try {
        const docs = await (await draftAwareClient()).fetch<
            CatalogProductLibraryDoc[]
        >(CATALOG_PRODUCT_LIBRARY_QUERY);
        const items: ProductLibraryItem[] = [];
        const lineMetas: ProductLibraryLineMeta[] = [];
        for (const doc of docs ?? []) {
            const item = mapSanityProductLibraryItem(doc);
            if (item) items.push(item);
            const lineMeta = mapSanityProductLibraryLineMeta(doc);
            if (lineMeta) lineMetas.push(lineMeta);
        }
        return buildProductLibraryResult(items, lineMetas);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity product library failed:', err);
        }
        return {items: [], linesBySlug: {}, facetCatalog: {shared: []}};
    }
}

const getCachedProducts = unstable_cache(
    fetchSanityProducts,
    [WWW_CATALOG_PRODUCTS_CACHE_TAG],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_PRODUCTS_CACHE_TAG],
    },
);

const getCachedLines = unstable_cache(
    fetchSanityLines,
    [WWW_CATALOG_LINES_CACHE_TAG],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_LINES_CACHE_TAG],
    },
);

const getCachedCustomizationLibrary = unstable_cache(
    fetchSanityCustomizationLibrary,
    [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
    },
);

const getCachedProductLibrary = unstable_cache(
    fetchSanityProductLibrary,
    [`${WWW_CATALOG_PRODUCTS_CACHE_TAG}-library`],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_PRODUCTS_CACHE_TAG],
    },
);

function getCachedProductBySlug(slug: string) {
    const key = normalizeSlug(slug);
    return unstable_cache(
        () => fetchSanityProduct(key),
        [wwwProductTag(key)],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_PRODUCTS_CACHE_TAG, wwwProductTag(key)],
        },
    )();
}

/**
 * Draft reads MUST NOT go through `unstable_cache`. Two reasons: a cached draft
 * is stale the moment the editor types again (so Presentation would show an old
 * value and look broken), and the cache is shared across requests, so one
 * editor's unpublished content could be served to somebody else. Draft mode is
 * request-scoped and uncached by design; published reads keep the cache exactly
 * as before.
 */
export async function listLines(): Promise<ProductLine[]> {
    return readThrough(fetchSanityLines, getCachedLines);
}

export async function listProducts(): Promise<Product[]> {
    return readThrough(fetchSanityProducts, getCachedProducts);
}

/** Faceted products library for `/products` (PROD-1845). */
export async function listProductLibrary(): Promise<ProductLibraryResult> {
    return readThrough(fetchSanityProductLibrary, getCachedProductLibrary);
}

/** Primary customizations library fetch (PROD-1288). Ticket name: getCustomizations. */
export async function listCustomizations(): Promise<CustomizationLibraryResult> {
    return readThrough(fetchSanityCustomizationLibrary, getCachedCustomizationLibrary);
}

/** @deprecated Prefer listCustomizations(); kept as thin alias for call sites. */
export async function listCustomizationCategories(): Promise<
    CustomizationLibraryItem[]
> {
    const result = await listCustomizations();
    return result.items;
}

export async function getCustomizationCategory(
    category: string,
    handle: string,
): Promise<CustomizationLibraryItem | null> {
    const categoryKey = normalizeSlug(category);
    const handleKey = normalizeSlug(handle);
    if (!isSanityConfigured()) return null;

    const fetchUncached = async (): Promise<CustomizationLibraryItem | null> => {
        try {
            const doc = await (await draftAwareClient()).fetch<
                CatalogLibraryOptionDoc | null
            >(CATALOG_CUSTOMIZATION_BY_CATEGORY_HANDLE_QUERY, {
                category: categoryKey,
                handle: handleKey,
            });
            return doc ? mapSanityLibraryOption(doc) : null;
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
                console.error(
                    '[catalog] Sanity customization by handle failed:',
                    err,
                );
            }
            return null;
        }
    };

    const getCached = unstable_cache(
        fetchUncached,
        [`www-customization:${categoryKey}:${handleKey}`],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
        },
    );

    return readThrough(fetchUncached, getCached);
}

export async function getCustomizationDetail(
    category: string,
    handle: string,
): Promise<CustomizationDetailResult | null> {
    const categoryKey = normalizeSlug(category);
    const handleKey = normalizeSlug(handle);
    if (!isSanityConfigured()) return null;

    const fetchUncached =
        async (): Promise<CustomizationDetailResult | null> => {
            try {
                const doc = await (await draftAwareClient()).fetch<
                    CatalogCustomizationDetailDoc | null
                >(CATALOG_CUSTOMIZATION_DETAIL_QUERY, {
                    category: categoryKey,
                    handle: handleKey,
                });
                const mapped = doc ? mapSanityCustomizationDetail(doc) : null;
                if (!mapped || !doc) return null;
                const peers = (doc.peers ?? [])
                    .map((peer) =>
                        peer ? mapSanityCustomizationDetail(peer) : null,
                    )
                    .filter(
                        (item): item is NonNullable<typeof item> =>
                            item != null,
                    );
                return {detail: mapped, peers};
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    console.error(
                        '[catalog] Sanity customization detail failed:',
                        err,
                    );
                }
                return null;
            }
        };

    const getCached = unstable_cache(
        fetchUncached,
        [`www-customization-detail:${categoryKey}:${handleKey}`],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
        },
    );

    return readThrough(fetchUncached, getCached);
}

/**
 * Active Option by id for builder Property controllers (no hasPage gate).
 */
export async function getCustomizationOption(
    optionId: string,
): Promise<CustomizationDetail | null> {
    const id = optionId.trim();
    if (!id || !isSanityConfigured()) return null;

    const fetchUncached = async (): Promise<CustomizationDetail | null> => {
        try {
            const doc = await (await draftAwareClient()).fetch<
                CatalogCustomizationDetailDoc | null
            >(CATALOG_OPTION_BY_ID_QUERY, {id});
            return doc ? mapSanityCustomizationDetail(doc) : null;
        } catch (err) {
            if (process.env.NODE_ENV === 'development') {
                console.error(
                    '[catalog] Sanity customization option by id failed:',
                    err,
                );
            }
            return null;
        }
    };

    const getCached = unstable_cache(
        fetchUncached,
        [`www-customization-option:${id}`],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
        },
    );

    return readThrough(fetchUncached, getCached);
}

export async function getProduct(slug: string): Promise<Product | null> {
    return readThrough(
        () => fetchSanityProduct(normalizeSlug(slug)),
        () => getCachedProductBySlug(slug),
    );
}

export async function getByProductsSegment(
    slug: string,
): Promise<ProductsSegmentResult | null> {
    const key = normalizeSlug(slug);
    const lines = await listLines();
    const line = lines.find((item) => item.slug === key);
    if (line) return {type: 'line', line};
    const product = await getProduct(key);
    if (product) return {type: 'product', product};
    return null;
}

export async function getStyle(
    lineSlug: string,
    styleSlug: string,
): Promise<{line: ProductLine; style: ProductStyleRef} | null> {
    const result = await getByProductsSegment(lineSlug);
    if (result?.type !== 'line') return null;
    const style = result.line.styles.find(
        (item) => item.slug === normalizeSlug(styleSlug),
    );
    if (!style) return null;
    return {line: result.line, style};
}
