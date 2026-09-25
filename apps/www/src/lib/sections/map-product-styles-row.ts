import type {
    PageSectionInspirationsCardDoc,
    PageSectionProductStylesRowDoc,
} from '@pakfactory/sanity/queries';
import type {WebsiteNavLinkDoc} from '@pakfactory/sanity/queries';

import type {
    ProductStylesCard,
} from '@/components/product/product-styles-section';
import {resolveWwwNavHref} from '@/lib/resolve-www-nav-href';
import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import {
    productHref,
    productStyleHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

export type ProductStylesRowMapped = {
    eyebrow?: string;
    headline: string;
    description?: string;
    cta?: {label: string; href: string};
    cards: ProductStylesCard[];
};

function resolveCatalogueHref(
    card: PageSectionInspirationsCardDoc,
): string | null {
    const docType = card._type?.trim();
    const slug = card.slug?.trim();

    if (docType === 'productStyle') {
        const lineSlug = card.lineSlug?.trim();
        if (lineSlug && slug) return productStyleHref(lineSlug, slug);
        return null;
    }

    if (docType === 'product') {
        const handle = card.handle?.trim();
        const collectionSlug = card.collectionSlug?.trim();
        const pageSlug = card.pageSlug?.trim();
        if (handle && collectionSlug && pageSlug) {
            return `${WWW_ROUTES.products}/${pageSlug}/${collectionSlug}/${handle}`;
        }
        if (slug) return productHref(slug);
        return null;
    }

    return null;
}

function mapCard(
    card: PageSectionInspirationsCardDoc,
    index: number,
): ProductStylesCard | null {
    const title = card.title?.trim();
    if (!title) return null;

    let href: string | null = null;
    if (card.kind === 'typed' || card._type === 'inspirationsCard') {
        const resolved = resolveWwwNavHref(
            card.link as Pick<
                WebsiteNavLinkDoc,
                'linkType' | 'externalUrl' | 'internalLink'
            > | null | undefined,
        );
        href = resolved?.href ?? null;
    } else {
        href = resolveCatalogueHref(card);
    }

    if (!href) return null;

    const description = card.description?.trim();
    const imageSrc = card.imageSrc?.trim() || null;
    const id =
        card._key?.trim() ||
        `${card._id?.trim() || title}-${index}`;

    return {
        id,
        title,
        href,
        ...(description ? {description} : {}),
        imageSrc,
        imageAlt: card.imageAlt?.trim() || title,
    };
}

/**
 * Map Sanity `productStylesRow` → ProductStylesSection props.
 * Allows cards without images (emptyMedia mark on the section).
 */
export function mapProductStylesRow(
    section: PageSectionProductStylesRowDoc,
): ProductStylesRowMapped {
    const cards: ProductStylesCard[] = [];
    for (const [index, row] of (section.cards ?? []).entries()) {
        const mapped = mapCard(row, index);
        if (mapped) cards.push(mapped);
    }

    const chrome = mapSectionChrome(section);
    const headline = section.heading?.trim() || 'Styles';
    const description =
        section.intro?.trim() ||
        'Compare constructions side by side before you add to a request.';

    return {
        headline,
        description,
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {eyebrow: 'Styles'}),
        ...(chrome.cta ? {cta: chrome.cta} : {}),
        cards,
    };
}
