import type {
    PageSectionInspirationsCardDoc,
    PageSectionInspirationsGridDoc,
} from '@pakfactory/sanity/queries';
import type {WebsiteNavLinkDoc} from '@pakfactory/sanity/queries';

import {resolveWwwNavHref} from '@/lib/resolve-www-nav-href';
import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import type {
    InspirationGalleryCard,
    InspirationGalleryContent,
} from '@/lib/solutions/types';
import {
    productHref,
    productStyleHref,
    solutionStyleHref,
    WWW_ROUTES,
} from '@/lib/www-routes';

function resolveCatalogueHref(
    card: PageSectionInspirationsCardDoc,
): string | null {
    const docType = card._type?.trim();
    const slug = card.slug?.trim();

    if (docType === 'solutionStyle') {
        const solutionSlug = card.solutionSlug?.trim();
        if (solutionSlug && slug) return solutionStyleHref(solutionSlug, slug);
        return null;
    }

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
): InspirationGalleryCard | null {
    const title = card.title?.trim();
    const imageSrc = card.imageSrc?.trim();
    if (!title || !imageSrc) return null;

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
    const id =
        card._key?.trim() ||
        `${card._id?.trim() || title}-${index}`;

    return {
        id,
        title,
        href,
        image: {
            src: imageSrc,
            alt: card.imageAlt?.trim() || title,
        },
        ...(description ? {description} : {}),
    };
}

/**
 * Map Sanity `inspirationsGrid` → InspirationGallery props (ADR-020 / WP3).
 * Studio chrome → align / borders / CTA label; heading/intro → headline/description.
 */
export function mapInspirationsGrid(
    section: PageSectionInspirationsGridDoc,
): InspirationGalleryContent {
    const cards: InspirationGalleryCard[] = [];
    for (const [index, row] of (section.cards ?? []).entries()) {
        const mapped = mapCard(row, index);
        if (mapped) cards.push(mapped);
    }

    const chrome = mapSectionChrome(section);
    const headline = section.heading?.trim() || 'Inspirations';
    const description = section.intro?.trim();

    return {
        headline,
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {}),
        ...(description ? {description} : {}),
        ...(chrome.cta ? {cta: chrome.cta} : {}),
        cards,
    };
}
