import type {
    PageSectionCatalogRowItemDoc,
    PageSectionProductLinesRowDoc,
    PageSectionSolutionsRowDoc,
} from '@pakfactory/sanity/queries';
import {isCatalogTargetVisible} from '@pakfactory/sanity/catalog-visibility';
import {stegaClean} from 'next-sanity';

import type {CatalogCardGridCard} from '@/components/ui/catalog-card-grid';
import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import {productHref, solutionHref} from '@/lib/www-routes';

export type CatalogRowContent = {
    eyebrow?: string;
    headline: string;
    description?: string;
    cta?: {label: string; href: string};
    align: 'left' | 'center';
    borderTop: boolean;
    borderBottom: boolean;
    cards: CatalogCardGridCard[];
};

function mapItems(
    items: (PageSectionCatalogRowItemDoc | null)[] | null | undefined,
    hrefFor: (slug: string) => string,
): CatalogCardGridCard[] {
    const cards: CatalogCardGridCard[] = [];
    for (const [index, item] of (items ?? []).entries()) {
        if (!item) continue;
        const title = item.title?.trim();
        const slug = item.slug?.trim();
        if (!title || !slug) continue;
        const visible = isCatalogTargetVisible({
            _type: item._type,
            status: (stegaClean(item.status ?? undefined) as string | undefined) ?? null,
            customerFacing: item.customerFacing,
            hasPage: item.hasPage,
        });
        if (!visible) continue;
        const description = item.description?.trim();
        cards.push({
            id: `${item._id?.trim() || slug}-${index}`,
            title,
            href: hrefFor(slug),
            ...(description ? {description} : {}),
            imageSrc: item.imageSrc?.trim() || null,
            imageAlt: item.imageAlt?.trim() || title,
        });
    }
    return cards;
}

function mapRow(
    section: PageSectionProductLinesRowDoc | PageSectionSolutionsRowDoc,
    fallbackHeadline: string,
    hrefFor: (slug: string) => string,
): CatalogRowContent {
    const chrome = mapSectionChrome(section);
    const description = section.intro?.trim();
    return {
        headline: section.heading?.trim() || fallbackHeadline,
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {}),
        ...(description ? {description} : {}),
        ...(chrome.cta ? {cta: chrome.cta} : {}),
        cards: mapItems(section.items, hrefFor),
    };
}

/**
 * `productLinesRow` → CatalogCardGrid (PROD-2666). Coming-soon, discontinued
 * and non-customer-facing lines are dropped (shared visibility mirror).
 */
export function mapProductLinesRow(
    section: PageSectionProductLinesRowDoc,
): CatalogRowContent {
    return mapRow(section, 'Products', productHref);
}

/** `solutionsRow` → CatalogCardGrid (PROD-2666). Solutions without a page are dropped. */
export function mapSolutionsRow(
    section: PageSectionSolutionsRowDoc,
): CatalogRowContent {
    return mapRow(section, 'Industries', solutionHref);
}
