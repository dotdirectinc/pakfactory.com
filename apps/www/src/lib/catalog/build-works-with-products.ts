/**
 * Compatible products for the customization detail Works with browser (PROD-2921).
 */

import type {ProductOfferIndex} from '@/lib/catalog/product-offer-index';
import type {
    ProductLibraryItem,
    ProductLibraryResult,
    ProductLineRef,
} from '@/lib/catalog/types';

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

export type WorksWithOptionRef = {
    id: string;
    category: string;
    slug: string;
    title: string;
};

function toCard(item: ProductLibraryItem): WorksWithProductCard {
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
    productLibrary: ProductLibraryResult;
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

    const products = input.productLibrary.items
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
