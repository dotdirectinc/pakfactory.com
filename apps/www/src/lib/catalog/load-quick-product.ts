'use server';

import {getProduct} from '@/lib/catalog/catalog';
import type {Product} from '@/lib/catalog/types';

/**
 * Quick configure: the product for the drawer, loaded on demand with the same
 * cached catalog read the product page uses.
 */
export async function loadQuickProduct(slug: string): Promise<{product: Product} | null> {
    const product = await getProduct(slug);
    return product ? {product} : null;
}

export type ApplyCheck = {
    slug: string;
    ok: boolean;
    /** One-line reason when it can't take the customization. */
    reason?: string;
    title?: string;
    lineTitle?: string;
    imageUrl?: string;
};

/**
 * Apply popup: can each product take this customization?
 * Same rule as the PDP preselect: the option must be in the product's
 * availableCustomizations (category + slug). Unknown products are "not found".
 */
export async function checkApplyTargets(
    slugs: string[],
    option: {category: string; slug: string},
): Promise<ApplyCheck[]> {
    const unique = [...new Set(slugs.filter(Boolean))].slice(0, 40);
    const cat = option.category.toLowerCase();
    const opt = option.slug.toLowerCase();
    return Promise.all(
        unique.map(async (slug): Promise<ApplyCheck> => {
            const product = await getProduct(slug);
            if (!product) return {slug, ok: false, reason: 'No longer in the catalog'};
            const base = {
                slug,
                title: product.title,
                lineTitle: product.productLine.title,
                ...(product.media[0]?.src ? {imageUrl: product.media[0].src} : {}),
            };
            if (product.status && product.status !== 'active') {
                return {...base, ok: false, reason: 'Not available to order right now'};
            }
            const ok = product.availableCustomizations.some(
                (o) =>
                    (o.category ?? '').toLowerCase() === cat &&
                    (o.slug ?? '').toLowerCase() === opt,
            );
            return ok
                ? {...base, ok: true}
                : {...base, ok: false, reason: `Not available on ${product.productLine.title}`};
        }),
    );
}
