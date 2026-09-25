import 'server-only';

import {cache} from 'react';
import {unstable_cache} from 'next/cache';
import {
    CATALOG_CUSTOMIZATION_BY_CATEGORY_HANDLE_QUERY,
    CATALOG_CUSTOMIZATION_DETAIL_QUERY,
    CATALOG_CUSTOMIZATION_LIBRARY_QUERY,
    CATALOG_CUSTOMIZATION_RULES_QUERY,
    CATALOG_OPTION_BY_ID_QUERY,
    CATALOG_PRODUCT_BY_SLUG_QUERY,
    CATALOG_PRODUCT_LIBRARY_QUERY,
    CATALOG_PRODUCT_LINE_BY_SLUG_QUERY,
    CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY,
    CATALOG_PRODUCT_LINES_QUERY,
    CATALOG_PRODUCTS_QUERY,
    CUSTOMIZATION_CATALOG_PAGE_QUERY,
    PRODUCT_CATALOG_PAGE_QUERY,
    PRODUCT_STYLE_PAGE_QUERY,
    type CatalogCustomizationDetailDoc,
    type CatalogCustomizationRulesDoc,
    type CatalogIndexPageDoc,
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
import {PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID} from '@/lib/catalog/types';
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

async function fetchSanityLineBySlug(slug: string): Promise<ProductLine | null> {
    if (!isSanityConfigured()) return null;
    try {
        const doc = await (
            await draftAwareClient()
        ).fetch<CatalogProductLineDoc | null>(
            CATALOG_PRODUCT_LINE_BY_SLUG_QUERY,
            {slug: normalizeSlug(slug)},
        );
        const line = doc ? mapSanityProductLine(doc) : null;
        if (!line) return null;
        if (line.products.length === 0 && line.styles.length === 0) {
            return null;
        }
        return line;
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity product line by slug failed:', err);
        }
        return null;
    }
}

async function fetchSanityLineExists(slug: string): Promise<boolean> {
    if (!isSanityConfigured()) return false;
    try {
        const id = await (await draftAwareClient()).fetch<string | null>(
            CATALOG_PRODUCT_LINE_EXISTS_BY_SLUG_QUERY,
            {slug: normalizeSlug(slug)},
        );
        return Boolean(id);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity product line exists failed:', err);
        }
        return false;
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
        // Curated relatedProducts stay on the blocking path; sibling fallback
        // loads under Suspense in ProductDetailView (see listRelatedProductSiblings).
        return resolveProductOffer(mapped, doc);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity product by slug failed:', err);
        }
        return null;
    }
}

const RELATED_PRODUCTS_CAP = 6;

/**
 * Same-line siblings when the product has no curated relatedProducts (PROD-1913).
 * Loaded under Suspense so the PDP hero is not blocked by listProducts().
 */
export async function listRelatedProductSiblings(
    product: Product,
): Promise<Product[]> {
    if (product.relatedProducts && product.relatedProducts.length > 0) {
        return product.relatedProducts;
    }
    const lineSlug = product.productLine.slug;
    return (await listProducts())
        .filter(
            (item) =>
                item.slug !== product.slug &&
                item.productLine.slug === lineSlug,
        )
        .slice(0, RELATED_PRODUCTS_CAP);
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

const EMPTY_PRODUCT_LIBRARY: ProductLibraryResult = {
    items: [],
    linesBySlug: {},
    stylesByLineSlug: {},
    propertyTitles: {},
    facetCatalog: {shared: []},
};

async function fetchSanityProductLibrary(): Promise<ProductLibraryResult> {
    if (!isSanityConfigured()) {
        return EMPTY_PRODUCT_LIBRARY;
    }
    try {
        const docs = await (await draftAwareClient()).fetch<
            CatalogProductLibraryDoc[]
        >(CATALOG_PRODUCT_LIBRARY_QUERY);
        const items: ProductLibraryItem[] = [];
        const lineMetas: ProductLibraryLineMeta[] = [];
        const propertyTitles: Record<string, string> = {};
        const valueTitles: Record<string, string> = {};
        for (const doc of docs ?? []) {
            const mapped = mapSanityProductLibraryItem(doc);
            if (mapped) {
                items.push(mapped.item);
                Object.assign(propertyTitles, mapped.propertyTitles);
                Object.assign(valueTitles, mapped.valueTitles);
            }
            const lineMeta = mapSanityProductLibraryLineMeta(doc);
            if (lineMeta) lineMetas.push(lineMeta);
        }
        return buildProductLibraryResult(items, lineMetas, {
            propertyTitles,
            valueTitles,
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity product library failed:', err);
        }
        return EMPTY_PRODUCT_LIBRARY;
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

function getCachedLineBySlug(slug: string) {
    const key = normalizeSlug(slug);
    return unstable_cache(
        () => fetchSanityLineBySlug(key),
        [`www-product-line:${key}`],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_LINES_CACHE_TAG],
        },
    )();
}

function getCachedLineExists(slug: string) {
    const key = normalizeSlug(slug);
    return unstable_cache(
        () => fetchSanityLineExists(key),
        [`www-product-line-exists:${key}`],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_LINES_CACHE_TAG],
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

/**
 * Product library scoped to one line + style for `/products/[line]/[style]`.
 * Omits the Product Line facet (the page already is that line).
 */
export async function listProductStyleLibrary(
    lineSlug: string,
    styleSlug: string,
): Promise<ProductLibraryResult> {
    const library = await listProductLibrary();
    const lineKey = normalizeSlug(lineSlug);
    const styleKey = normalizeSlug(styleSlug);
    const items = library.items.filter(
        (item) =>
            item.productLine.slug === lineKey &&
            item.productStyle.slug === styleKey,
    );
    const lineMetas = Object.values(library.linesBySlug).filter(
        (meta) => meta.slug === lineKey,
    );
    return buildProductLibraryResult(items, lineMetas, {
        omitFacetIds: [PRODUCT_CATALOG_PRODUCT_LINE_FACET_ID],
        propertyTitles: library.propertyTitles,
    });
}

async function fetchProductCatalogPage(): Promise<CatalogIndexPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (await draftAwareClient()).fetch<CatalogIndexPageDoc | null>(
            PRODUCT_CATALOG_PAGE_QUERY,
        );
    } catch {
        return null;
    }
}

const getCachedProductCatalogPage = unstable_cache(
    fetchProductCatalogPage,
    [`${WWW_CATALOG_PRODUCTS_CACHE_TAG}-page`],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_PRODUCTS_CACHE_TAG],
    },
);

/** Sections below the `/products` grid (PROD-2589 / PROD-2599). */
export async function getProductCatalogPage(): Promise<CatalogIndexPageDoc | null> {
    return readThrough(fetchProductCatalogPage, getCachedProductCatalogPage);
}

async function fetchProductStylePage(): Promise<CatalogIndexPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (await draftAwareClient()).fetch<CatalogIndexPageDoc | null>(
            PRODUCT_STYLE_PAGE_QUERY,
        );
    } catch {
        return null;
    }
}

const getCachedProductStylePage = unstable_cache(
    fetchProductStylePage,
    [`${WWW_CATALOG_PRODUCTS_CACHE_TAG}-style-page`],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_PRODUCTS_CACHE_TAG],
    },
);

/** Sections below every `/products/[line]/[style]` catalog grid. */
export async function getProductStylePage(): Promise<CatalogIndexPageDoc | null> {
    return readThrough(fetchProductStylePage, getCachedProductStylePage);
}

async function fetchCustomizationCatalogPage(): Promise<CatalogIndexPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (await draftAwareClient()).fetch<CatalogIndexPageDoc | null>(
            CUSTOMIZATION_CATALOG_PAGE_QUERY,
        );
    } catch {
        return null;
    }
}

const getCachedCustomizationCatalogPage = unstable_cache(
    fetchCustomizationCatalogPage,
    [`${WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG}-page`],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
    },
);

/** Sections below the `/customizations` grid (PROD-2599). */
export async function getCustomizationCatalogPage(): Promise<CatalogIndexPageDoc | null> {
    return readThrough(
        fetchCustomizationCatalogPage,
        getCachedCustomizationCatalogPage,
    );
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

export const getCustomizationDetail = cache(
    async (
        category: string,
        handle: string,
    ): Promise<CustomizationDetailResult | null> => {
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
                    const mapped = doc
                        ? mapSanityCustomizationDetail(doc)
                        : null;
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
    },
);

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

export async function getLine(slug: string): Promise<ProductLine | null> {
    return readThrough(
        () => fetchSanityLineBySlug(normalizeSlug(slug)),
        () => getCachedLineBySlug(slug),
    );
}

async function productLineExists(slug: string): Promise<boolean> {
    return readThrough(
        () => fetchSanityLineExists(normalizeSlug(slug)),
        () => getCachedLineExists(slug),
    );
}

/**
 * Resolve `/products/[slug]` as a product line (wins) or a product.
 * Product clicks wait on a tiny line probe + getProduct — not the full line
 * landing document. Full line loads only when the probe hits.
 */
export const getByProductsSegment = cache(
    async (slug: string): Promise<ProductsSegmentResult | null> => {
        const key = normalizeSlug(slug);
        const [lineExists, product] = await Promise.all([
            productLineExists(key),
            getProduct(key),
        ]);
        if (lineExists) {
            const line = await getLine(key);
            if (line) return {type: 'line', line};
        }
        if (product) return {type: 'product', product};
        return null;
    },
);

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
