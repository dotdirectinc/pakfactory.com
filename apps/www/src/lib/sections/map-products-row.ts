import type {PageSectionProductsRowDoc} from '@pakfactory/sanity/queries';

import type {ProductsRowItem} from '@/components/sections/products-row';
import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import type {SectionAlign} from '@/lib/sections/map-section-chrome';
import {productHref} from '@/lib/www-routes';

/**
 * Map Sanity `productsRow` → ProductsRow props (PROD-2763 PDP Related strip).
 */
export function mapProductsRow(section: PageSectionProductsRowDoc): {
    heading?: string;
    description?: string;
    eyebrow?: string;
    products: ProductsRowItem[];
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
    cta?: {label: string; href: string};
} {
    const products: ProductsRowItem[] = [];
    for (const item of section.items ?? []) {
        if (!item) continue;
        const title = item.title?.trim();
        const slug = item.slug?.trim();
        if (!title || !slug) continue;
        products.push({
            title,
            href: productHref(slug),
            ...(item.sku?.trim() ? {sku: item.sku.trim()} : {}),
            imageSrc: item.imageSrc ?? null,
            imageAlt: item.imageAlt?.trim() || title,
        });
    }

    const chrome = mapSectionChrome(section);
    const heading = section.heading?.trim();
    const intro = section.intro?.trim();

    return {
        ...(heading ? {heading} : {}),
        ...(intro ? {description: intro} : {}),
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {}),
        products,
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        ...(chrome.cta ? {cta: chrome.cta} : {}),
    };
}
