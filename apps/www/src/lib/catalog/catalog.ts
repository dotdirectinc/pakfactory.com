import 'server-only';

import {unstable_cache} from 'next/cache';
import {
    CATALOG_CUSTOMIZATION_BY_CATEGORY_HANDLE_QUERY,
    CATALOG_CUSTOMIZATION_LIBRARY_QUERY,
    CATALOG_PRODUCT_BY_SLUG_QUERY,
    CATALOG_PRODUCT_LINES_QUERY,
    CATALOG_PRODUCTS_QUERY,
    type CatalogLibraryOptionDoc,
    type CatalogProductDoc,
    type CatalogProductLineDoc,
} from '@pakfactory/sanity/queries';
import {buildCustomizationLibraryResult} from '@/lib/catalog/build-customization-library';
import {
    mapSanityLibraryOption,
    mapSanityProduct,
    mapSanityProductLine,
} from '@/lib/catalog/map-sanity';
import type {
    CustomizationLibraryItem,
    CustomizationLibraryResult,
    Product,
    ProductLine,
    ProductStyleRef,
    ProductsSegmentResult,
} from '@/lib/catalog/types';
import {draftMode} from 'next/headers';
import type {SanityClient} from 'next-sanity';
import {
    getPublishedSanityClient,
    getSanityClient,
} from '@/lib/sanity/client';
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

/**
 * Is this request inside a Presentation / draft-mode session?
 *
 * `draftMode()` is a dynamic API: it THROWS when there is no request scope, and
 * `generateStaticParams` has none — `listLines()` is called from there on
 * /products/[slug]. So the throw is caught and treated as "not a draft", which
 * keeps static generation on the cached published path. Without the catch,
 * making this seam draft-aware would break the build.
 */
async function isDraftRequest(): Promise<boolean> {
    try {
        return (await draftMode()).isEnabled;
    } catch {
        return false;
    }
}

/**
 * The client this seam reads through.
 *
 * Draft mode needs the `drafts` perspective for two reasons, only one of which
 * is obvious. The first is content: unpublished edits must be visible. The
 * second is that `stega` is enabled ONLY on the drafts client
 * (`apps/www/src/lib/sanity/client.ts`), and stega encoding is what lets Sanity
 * Presentation map rendered output back to documents and fields. Without it the
 * pane renders but shows "No matching documents" and no click-to-edit overlays
 * — which is exactly what this seam did before, because every fetch used the
 * published client.
 *
 * Outside draft mode nothing changes: same published client, same CDN, no token.
 */
async function catalogClient(): Promise<SanityClient> {
    return (await isDraftRequest())
        ? getSanityClient()
        : getPublishedSanityClient();
}

async function fetchSanityProducts(): Promise<Product[]> {
    if (!isSanityConfigured()) return [];
    try {
        const docs = await (await catalogClient()).fetch<CatalogProductDoc[]>(
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
        const docs = await (await catalogClient()).fetch<
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

async function fetchSanityProduct(slug: string): Promise<Product | null> {
    if (!isSanityConfigured()) return null;
    try {
        const doc = await (await catalogClient()).fetch<CatalogProductDoc | null>(
            CATALOG_PRODUCT_BY_SLUG_QUERY,
            {slug: normalizeSlug(slug)},
        );
        if (!doc) return null;
        const mapped = mapSanityProduct(doc);
        if (!mapped) return null;
        return enrichRelatedProducts(mapped);
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
        const docs = await (await catalogClient()).fetch<
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
    return (await isDraftRequest()) ? fetchSanityLines() : getCachedLines();
}

export async function listProducts(): Promise<Product[]> {
    return (await isDraftRequest()) ? fetchSanityProducts() : getCachedProducts();
}

/** Primary customizations library fetch (PROD-1288). Ticket name: getCustomizations. */
export async function listCustomizations(): Promise<CustomizationLibraryResult> {
    return (await isDraftRequest())
        ? fetchSanityCustomizationLibrary()
        : getCachedCustomizationLibrary();
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
            const doc = await (await catalogClient()).fetch<
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

    return (await isDraftRequest()) ? fetchUncached() : getCached();
}

export async function getProduct(slug: string): Promise<Product | null> {
    return (await isDraftRequest())
        ? fetchSanityProduct(normalizeSlug(slug))
        : getCachedProductBySlug(slug);
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
