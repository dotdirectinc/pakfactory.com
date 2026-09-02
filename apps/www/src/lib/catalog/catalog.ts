import {LINES, PRODUCTS} from '@/lib/catalog/catalog.mock';
import {CUSTOMIZATION_CATEGORIES} from '@/lib/catalog/customization.mock';
import type {CustomizationCardData} from '@/components/customization/customization-card';
import type {
    Product,
    ProductLine,
    ProductStyleRef,
    ProductsSegmentResult,
} from '@/lib/catalog/types';

function normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
}

export function listLines(): ProductLine[] {
    return LINES;
}

export function listProducts(): Product[] {
    return PRODUCTS;
}

export function listCustomizationCategories(): CustomizationCardData[] {
    return CUSTOMIZATION_CATEGORIES;
}

export function getCustomizationCategory(
    category: string,
    handle: string,
): CustomizationCardData | null {
    const categoryKey = normalizeSlug(category);
    const handleKey = normalizeSlug(handle);
    return (
        CUSTOMIZATION_CATEGORIES.find(
            (item) =>
                item.categoryValue === categoryKey && item.slug === handleKey,
        ) ?? null
    );
}

export function getProduct(slug: string): Product | null {
    const key = normalizeSlug(slug);
    return PRODUCTS.find((product) => product.slug === key) ?? null;
}

export function getByProductsSegment(slug: string): ProductsSegmentResult | null {
    const key = normalizeSlug(slug);
    const line = LINES.find((item) => item.slug === key);
    if (line) return {type: 'line', line};
    const product = getProduct(key);
    if (product) return {type: 'product', product};
    return null;
}

export function getStyle(
    lineSlug: string,
    styleSlug: string,
): {line: ProductLine; style: ProductStyleRef} | null {
    const result = getByProductsSegment(lineSlug);
    if (result?.type !== 'line') return null;
    const style = result.line.styles.find(
        (item) => item.slug === normalizeSlug(styleSlug),
    );
    if (!style) return null;
    return {line: result.line, style};
}
