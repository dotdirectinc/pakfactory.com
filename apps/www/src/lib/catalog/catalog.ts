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
import {
    mapSanityLibraryOption,
    mapSanityProduct,
    mapSanityProductLine,
} from '@/lib/catalog/map-sanity';
import type {
    Product,
    ProductLine,
    ProductStyleRef,
    ProductsSegmentResult,
} from '@/lib/catalog/types';
import type {CustomizationCardData} from '@/components/customization/customization-card';
import {getPublishedSanityClient} from '@/lib/sanity/client';
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
        const docs = await getPublishedSanityClient().fetch<CatalogProductDoc[]>(
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
        const docs = await getPublishedSanityClient().fetch<
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
        const doc = await getPublishedSanityClient().fetch<CatalogProductDoc | null>(
            CATALOG_PRODUCT_BY_SLUG_QUERY,
            {slug: normalizeSlug(slug)},
        );
        return doc ? mapSanityProduct(doc) : null;
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity product by slug failed:', err);
        }
        return null;
    }
}

async function fetchSanityCustomizationLibrary(): Promise<
    CustomizationCardData[]
> {
    if (!isSanityConfigured()) return [];
    try {
        const docs = await getPublishedSanityClient().fetch<
            CatalogLibraryOptionDoc[]
        >(CATALOG_CUSTOMIZATION_LIBRARY_QUERY);
        return (docs ?? [])
            .map(mapSanityLibraryOption)
            .filter((item): item is CustomizationCardData => item != null);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[catalog] Sanity customization library failed:', err);
        }
        return [];
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

export async function listLines(): Promise<ProductLine[]> {
    return getCachedLines();
}

export async function listProducts(): Promise<Product[]> {
    return getCachedProducts();
}

export async function listCustomizationCategories(): Promise<
    CustomizationCardData[]
> {
    return getCachedCustomizationLibrary();
}

export async function getCustomizationCategory(
    category: string,
    handle: string,
): Promise<CustomizationCardData | null> {
    const categoryKey = normalizeSlug(category);
    const handleKey = normalizeSlug(handle);
    if (!isSanityConfigured()) return null;

    const getCached = unstable_cache(
        async () => {
            try {
                const doc = await getPublishedSanityClient().fetch<
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
        },
        [`www-customization:${categoryKey}:${handleKey}`],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG],
        },
    );

    return getCached();
}

export async function getProduct(slug: string): Promise<Product | null> {
    return getCachedProductBySlug(slug);
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
