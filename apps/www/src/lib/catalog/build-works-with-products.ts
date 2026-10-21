/**
 * Compatible products for the customization detail Works with browser (PROD-2921).
 */

import type {ProductOfferIndex} from '@/lib/catalog/product-offer-index';
import type {ProductLibraryItem, ProductLineRef} from '@/lib/catalog/types';

export type WorksWithProductCard = {
    id: string;
    slug: string;
    title: string;
    sku?: string;
    imageUrl?: string | null;
    imageAlt?: string | null;
    productLineSlug: string;
    productLineTitle: string;
};

/**
 * What the Works with browser reads of a product — a library item's card fields
 * (PROD-3121). Kept small so the list is cacheable (Next's data cache stops at
 * 2 MB; the whole library is ~3.9 MB once mapped).
 */
export type WorksWithSourceItem = Pick<
    ProductLibraryItem,
    '_id' | 'kind' | 'slug' | 'title' | 'sku' | 'imageUrl' | 'imageAlt' | 'productLine'
>;

/** A library item reduced to {@link WorksWithSourceItem} — the same values, nothing else. */
export function toWorksWithSource(item: ProductLibraryItem): WorksWithSourceItem {
    return {
        _id: item._id,
        kind: item.kind,
        slug: item.slug,
        title: item.title,
        sku: item.sku,
        imageUrl: item.imageUrl,
        imageAlt: item.imageAlt,
        productLine: {slug: item.productLine.slug, title: item.productLine.title},
    };
}

export type WorksWithOptionRef = {
    id: string;
    category: string;
    slug: string;
    title: string;
};

function toCard(item: WorksWithSourceItem): WorksWithProductCard {
    return {
        id: item._id,
        slug: item.slug,
        title: item.title,
        sku: item.sku || undefined,
        imageUrl: item.imageUrl ?? null,
        imageAlt: item.imageAlt ?? item.title,
        productLineSlug: item.productLine.slug,
        productLineTitle: item.productLine.title,
    };
}

/**
 * Products whose base offer includes `optionId`, ordered by title.
 * Prefer `detail.productLines` for the rail; fall back to lines present on matches.
 */
export function buildWorksWithProducts(input: {
    optionId: string;
    /** Library items, or the cached {@link WorksWithSourceItem} list (PROD-3121). */
    products: readonly WorksWithSourceItem[];
    offerIndex: ProductOfferIndex;
    preferredLines?: ProductLineRef[];
}): {
    products: WorksWithProductCard[];
    lines: ProductLineRef[];
} {
    const offerByProductId = new Map(
        input.offerIndex.entries.map((entry) => [
            entry.productId,
            entry.baseOfferIds,
        ]),
    );

    const products = input.products
        .filter((item) => {
            if (item.kind !== 'standard') return false;
            const offer = offerByProductId.get(item._id);
            return offer?.has(input.optionId) ?? false;
        })
        .map(toCard)
        .sort((a, b) => a.title.localeCompare(b.title));

    const preferred = input.preferredLines ?? [];
    if (preferred.length > 0) {
        const withProducts = new Set(products.map((p) => p.productLineSlug));
        const lines = preferred.filter((line) => withProducts.has(line.slug));
        // Keep authored order; append lines that have products but were not listed.
        const seen = new Set(lines.map((l) => l.slug));
        for (const product of products) {
            if (seen.has(product.productLineSlug)) continue;
            seen.add(product.productLineSlug);
            lines.push({
                slug: product.productLineSlug,
                title: product.productLineTitle,
            });
        }
        return {products, lines};
    }

    const bySlug = new Map<string, ProductLineRef>();
    for (const product of products) {
        if (bySlug.has(product.productLineSlug)) continue;
        bySlug.set(product.productLineSlug, {
            slug: product.productLineSlug,
            title: product.productLineTitle,
        });
    }
    const lines = [...bySlug.values()].sort((a, b) =>
        a.title.localeCompare(b.title),
    );
    return {products, lines};
}
