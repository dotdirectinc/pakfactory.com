import 'server-only';

import {
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

export async function listLines(): Promise<ProductLine[]> {
    return fetchSanityLines();
}

export async function listProducts(): Promise<Product[]> {
    return fetchSanityProducts();
}

export async function listCustomizationCategories(): Promise<
    CustomizationCardData[]
> {
    return fetchSanityCustomizationLibrary();
}

export async function getCustomizationCategory(
    category: string,
    handle: string,
): Promise<CustomizationCardData | null> {
    const categoryKey = normalizeSlug(category);
    const handleKey = normalizeSlug(handle);
    const items = await listCustomizationCategories();
    return (
        items.find(
            (item) =>
                item.categoryValue === categoryKey && item.slug === handleKey,
        ) ?? null
    );
}

export async function getProduct(slug: string): Promise<Product | null> {
    return fetchSanityProduct(slug);
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
