import 'server-only';

import {cache} from 'react';
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
    CATALOG_PRODUCT_STYLE_PAGE_QUERY,
    CATALOG_PRODUCTS_QUERY,
    CUSTOMIZATION_CATALOG_PAGE_QUERY,
    CUSTOMIZATION_DETAIL_PAGE_FOR_OPTION_QUERY,
    PRODUCT_CATALOG_PAGE_QUERY,
    PRODUCT_STYLE_PAGE_FOR_STYLE_QUERY,
    SOLUTION_STYLE_PAGE_FOR_STYLE_QUERY,
    SOLUTION_STYLES_FOR_BREADCRUMB_QUERY,
    type CatalogCustomizationDetailDoc,
    type CatalogCustomizationRulesDoc,
    type CatalogIndexPageDoc,
    type CatalogLibraryOptionDoc,
    type CatalogOptionDoc,
    type CatalogProductDoc,
    type CatalogProductLibraryDoc,
    type CatalogProductLineDoc,
    type CatalogStyleRefDoc,
    type SolutionStylesForBreadcrumbDoc,
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
    mapStyleRef,
} from '@/lib/catalog/map-sanity';
import {
    PRODUCT_LINE_PRODUCT_KIND,
    productsOfKind,
} from '@/lib/catalog/product-kind';
import {
    filterCuratedRelatedProducts,
    pickRelatedProducts,
} from '@/lib/catalog/related-products';
import {breadcrumbStyleFromBundle} from '@/lib/catalog/resolve-breadcrumb-style';
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
import {membershipStyles} from '@/lib/catalog/types';
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
    WWW_SOLUTIONS_CACHE_TAG,
    wwwProductTag,
} from '@/lib/www-cache';
import {sanityCache, sanityReadFailed} from '@/lib/sanity/sanity-cache';

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
        throw sanityReadFailed('[catalog] Sanity products fetch failed:', err);
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
        throw sanityReadFailed('[catalog] Sanity product lines fetch failed:', err);
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
        throw sanityReadFailed('[catalog] Sanity product line by slug failed:', err);
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
        throw sanityReadFailed('[catalog] Sanity product line exists failed:', err);
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
        throw sanityReadFailed('[catalog] Sanity customization rules fetch failed:', err);
    }
}

const getCachedCustomizationRules = sanityCache(
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
        const client = await draftAwareClient();
        const doc = await client.fetch<CatalogProductDoc | null>(
            CATALOG_PRODUCT_BY_SLUG_QUERY,
            {slug: normalizeSlug(slug)},
        );
        if (!doc) return null;
        const mapped = mapSanityProduct(doc);
        if (!mapped) return null;

        let product = mapped;
        if (
            mapped.kind === 'inspiration' &&
            mapped.breadcrumbParent?.slug
        ) {
            try {
                const bundle = await client.fetch<
                    SolutionStylesForBreadcrumbDoc | null
                >(SOLUTION_STYLES_FOR_BREADCRUMB_QUERY, {
                    solutionSlug: mapped.breadcrumbParent.slug,
                });
                const breadcrumbStyle = breadcrumbStyleFromBundle(doc, bundle);
                if (breadcrumbStyle) {
                    product = {...mapped, breadcrumbStyle};
                }
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    console.error(
                        '[catalog] Solution style breadcrumb resolve failed:',
                        err,
                    );
                }
            }
        }

        // Curated relatedProducts stay on the blocking path; sibling fallback
        // is resolved in ProductDetailView for productsRow inherit (PROD-2763).
        return resolveProductOffer(product, doc);
    } catch (err) {
        throw sanityReadFailed('[catalog] Sanity product by slug failed:', err);
    }
}

/**
 * Curated relatedProducts when set; else style→industry sibling fallback
 * (PROD-1913 / PROD-2780). Used as productsRow inherit on the PDP (PROD-2763).
 */
export async function listRelatedProductSiblings(
    product: Product,
): Promise<Product[]> {
    if (product.relatedProducts && product.relatedProducts.length > 0) {
        return filterCuratedRelatedProducts(product, product.relatedProducts);
    }
    return pickRelatedProducts(product, await listProducts());
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
        throw sanityReadFailed('[catalog] Sanity customization library failed:', err);
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
        throw sanityReadFailed('[catalog] Sanity product library failed:', err);
    }
}

const getCachedProducts = sanityCache(
    fetchSanityProducts,
    // v2: card projection includes breadcrumbParent for Related Products (PROD-2780).
    [`${WWW_CATALOG_PRODUCTS_CACHE_TAG}:v2-breadcrumb`],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_PRODUCTS_CACHE_TAG],
    },
);

const getCachedLines = sanityCache(
    fetchSanityLines,
    [WWW_CATALOG_LINES_CACHE_TAG],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_LINES_CACHE_TAG],
    },
);

const getCachedCustomizationLibrary = sanityCache(
    fetchSanityCustomizationLibrary,
    [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
    },
);

const getCachedProductLibrary = sanityCache(
    fetchSanityProductLibrary,
    // v2: productStyles[] membership for multi-style catalog (PROD-2843).
    [`${WWW_CATALOG_PRODUCTS_CACHE_TAG}-library-v2-styles`],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_PRODUCTS_CACHE_TAG],
    },
);

function getCachedProductBySlug(slug: string) {
    const key = normalizeSlug(slug);
    return sanityCache(
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
    return sanityCache(
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
    return sanityCache(
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
 * Standard products only (product-line surfaces). Omits the Product Line facet
 * (the page already is that line).
 */
export async function listProductStyleLibrary(
    lineSlug: string,
    styleSlug: string,
): Promise<ProductLibraryResult> {
    const library = await listProductLibrary();
    const lineKey = normalizeSlug(lineSlug);
    const styleKey = normalizeSlug(styleSlug);
    const scoped = library.items.filter(
        (item) =>
            item.productLine.slug === lineKey &&
            membershipStyles(item).some((style) => style.slug === styleKey),
    );
    const items = productsOfKind(scoped, PRODUCT_LINE_PRODUCT_KIND);
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
    } catch (err) {
        throw sanityReadFailed('[catalog] Sanity fetchProductCatalogPage failed:', err);
    }
}

const getCachedProductCatalogPage = sanityCache(
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

async function fetchProductStylePage(
    lineSlug: string,
    styleSlug: string,
): Promise<CatalogIndexPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (await draftAwareClient()).fetch<CatalogIndexPageDoc | null>(
            PRODUCT_STYLE_PAGE_FOR_STYLE_QUERY,
            {lineSlug, styleSlug},
        );
    } catch (err) {
        throw sanityReadFailed('[catalog] Sanity fetchProductStylePage failed:', err);
    }
}

/** Sections below a `/products/[line]/[style]` catalog grid (template → Default). */
export async function getProductStylePage(
    lineSlug: string,
    styleSlug: string,
): Promise<CatalogIndexPageDoc | null> {
    const lineKey = normalizeSlug(lineSlug);
    const styleKey = normalizeSlug(styleSlug);
    const fetchUncached = () => fetchProductStylePage(lineKey, styleKey);
    const getCached = sanityCache(
        fetchUncached,
        [`${WWW_CATALOG_PRODUCTS_CACHE_TAG}-style-page`, lineKey, styleKey],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_PRODUCTS_CACHE_TAG],
        },
    );
    return readThrough(fetchUncached, getCached);
}

async function fetchCustomizationCatalogPage(): Promise<CatalogIndexPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (await draftAwareClient()).fetch<CatalogIndexPageDoc | null>(
            CUSTOMIZATION_CATALOG_PAGE_QUERY,
        );
    } catch (err) {
        throw sanityReadFailed('[catalog] Sanity fetchCustomizationCatalogPage failed:', err);
    }
}

const getCachedCustomizationCatalogPage = sanityCache(
    fetchCustomizationCatalogPage,
    [`${WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG}-page`],
    {
        revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
        tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
    },
);

/** Sections below the `/customizations` grid (PROD-2599). Default fixed id only. */
export async function getCustomizationCatalogPage(): Promise<CatalogIndexPageDoc | null> {
    return readThrough(
        fetchCustomizationCatalogPage,
        getCachedCustomizationCatalogPage,
    );
}

async function fetchCustomizationDetailPage(
    category: string,
    handle: string,
): Promise<CatalogIndexPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (await draftAwareClient()).fetch<CatalogIndexPageDoc | null>(
            CUSTOMIZATION_DETAIL_PAGE_FOR_OPTION_QUERY,
            {category, handle},
        );
    } catch (err) {
        throw sanityReadFailed('[catalog] Sanity fetchCustomizationDetailPage failed:', err);
    }
}

/** Sections below a `/customizations/[category]/[handle]` detail chrome (template → Default). */
export async function getCustomizationDetailPage(
    category: string,
    handle: string,
): Promise<CatalogIndexPageDoc | null> {
    const categoryKey = normalizeSlug(category);
    const handleKey = normalizeSlug(handle);
    const fetchUncached = () =>
        fetchCustomizationDetailPage(categoryKey, handleKey);
    const getCached = sanityCache(
        fetchUncached,
        [
            `${WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG}-detail-page`,
            categoryKey,
            handleKey,
        ],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
        },
    );
    return readThrough(fetchUncached, getCached);
}

async function fetchSolutionStylePage(
    solutionSlug: string,
    styleSlug: string,
): Promise<CatalogIndexPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (await draftAwareClient()).fetch<CatalogIndexPageDoc | null>(
            SOLUTION_STYLE_PAGE_FOR_STYLE_QUERY,
            {solutionSlug, styleSlug},
        );
    } catch (err) {
        throw sanityReadFailed('[catalog] Sanity fetchSolutionStylePage failed:', err);
    }
}

/** Sections below a `/solutions/[solution]/[style]` catalog grid (template → Default). */
export async function getSolutionStylePage(
    solutionSlug: string,
    styleSlug: string,
): Promise<CatalogIndexPageDoc | null> {
    const solutionKey = normalizeSlug(solutionSlug);
    const styleKey = normalizeSlug(styleSlug);
    const fetchUncached = () => fetchSolutionStylePage(solutionKey, styleKey);
    const getCached = sanityCache(
        fetchUncached,
        [`${WWW_SOLUTIONS_CACHE_TAG}-style-page`, solutionKey, styleKey],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_SOLUTIONS_CACHE_TAG],
        },
    );
    return readThrough(fetchUncached, getCached);
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
            throw sanityReadFailed('[catalog] Sanity customization by handle failed:', err);
        }
    };

    const getCached = sanityCache(
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
                    throw sanityReadFailed('[catalog] Sanity customization detail failed:', err);
                }
            };

        const getCached = sanityCache(
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
            throw sanityReadFailed('[catalog] Sanity customization option by id failed:', err);
        }
    };

    const getCached = sanityCache(
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
    const key = normalizeSlug(styleSlug);
    const listed = result.line.styles.find((item) => item.slug === key);
    if (listed) return {line: result.line, style: listed};
    // Not in the grid: a Discontinued style keeps its page (for search) but is never
    // listed, so look it up directly. Everything else not listed has no page at all.
    const unlisted = await getUnlistedStylePage(result.line.slug, key);
    return unlisted ? {line: result.line, style: unlisted} : null;
}

async function getUnlistedStylePage(
    lineSlug: string,
    styleSlug: string,
): Promise<ProductStyleRef | null> {
    if (!isSanityConfigured()) return null;
    const fetchUncached = async (): Promise<ProductStyleRef | null> => {
        try {
            const doc = await (await draftAwareClient()).fetch<CatalogStyleRefDoc | null>(
                CATALOG_PRODUCT_STYLE_PAGE_QUERY,
                {lineSlug, styleSlug},
            );
            return doc ? mapStyleRef(doc) : null;
        } catch (err) {
            throw sanityReadFailed('[catalog] Sanity style page failed:', err);
        }
    };
    const getCached = sanityCache(
        fetchUncached,
        [`www-style-page:${lineSlug}:${styleSlug}`],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_PRODUCTS_CACHE_TAG, WWW_CATALOG_LINES_CACHE_TAG],
        },
    );
    return readThrough(fetchUncached, getCached);
}
