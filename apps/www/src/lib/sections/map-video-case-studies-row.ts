import type {
    PageSectionVideoCaseStudiesRowDoc,
    PageSectionVideoCaseStudyCardDoc,
} from '@pakfactory/sanity/queries';
import type {WebsiteNavLinkDoc} from '@pakfactory/sanity/queries';

import type {
    VideoCaseStudiesRowCard,
    VideoCaseStudiesRowContent,
} from '@/components/sections/video-case-studies-row';
import {resolveWwwNavHref} from '@/lib/resolve-www-nav-href';
import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import {WWW_ROUTES} from '@/lib/www-routes';

function resolveCardHref(
    card: PageSectionVideoCaseStudyCardDoc,
): string | null {
    if (card.kind === 'typed' || card._type === 'videoCaseStudyCard') {
        const resolved = resolveWwwNavHref(
            card.link as Pick<
                WebsiteNavLinkDoc,
                'linkType' | 'externalUrl' | 'internalLink'
            > | null | undefined,
        );
        return resolved?.href ?? null;
    }

    const slug = card.slug?.trim();
    if (slug) return `${WWW_ROUTES.caseStudies}/${slug}`;
    return null;
}

function mapCard(
    card: PageSectionVideoCaseStudyCardDoc,
    index: number,
): VideoCaseStudiesRowCard | null {
    const title = card.title?.trim();
    const brand = card.brand?.trim() || title;
    const imageSrc = card.imageSrc?.trim();
    if (!title || !brand || !imageSrc) return null;

    const href = resolveCardHref(card);
    if (!href) return null;

    const id =
        card._key?.trim() ||
        `${card._id?.trim() || brand}-${index}`;

    const logoSrc = card.logoSrc?.trim();
    const videoSrc = card.videoSrc?.trim();

    const metricTitle =
        card.metric?.title?.trim() || card.metricTitle?.trim();
    const metricBody =
        card.metric?.body?.trim() || card.metricBody?.trim();

    return {
        id,
        brand,
        title,
        href,
        image: {
            src: imageSrc,
            alt: card.imageAlt?.trim() || title,
        },
        ...(logoSrc
            ? {
                  logo: {
                      src: logoSrc,
                      alt: card.logoAlt?.trim() || brand,
                  },
              }
            : {}),
        ...(videoSrc ? {videoSrc} : {}),
        ...(metricTitle && metricBody
            ? {metric: {title: metricTitle, body: metricBody}}
            : {}),
    };
}

/**
 * Map Sanity `videoCaseStudiesRow` → VideoCaseStudiesRow props (ADR-020 / WP3).
 */
export function mapVideoCaseStudiesRow(
    section: PageSectionVideoCaseStudiesRowDoc,
): VideoCaseStudiesRowContent {
    const cards: VideoCaseStudiesRowCard[] = [];
    for (const [index, row] of (section.cards ?? []).entries()) {
        const mapped = mapCard(row, index);
        if (mapped) cards.push(mapped);
    }

    const chrome = mapSectionChrome(section);
    const headline = section.heading?.trim() || 'Case studies';
    const description = section.intro?.trim();

    return {
        eyebrow: chrome.eyebrow ?? 'On camera',
        headline,
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        ...(description ? {description} : {}),
        ...(chrome.cta ? {cta: chrome.cta} : {}),
        cards,
    };
}
