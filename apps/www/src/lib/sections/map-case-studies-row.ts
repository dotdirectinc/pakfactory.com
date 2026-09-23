import type {PageSectionCaseStudiesRowDoc} from '@pakfactory/sanity/queries';

import type {
    CaseStudiesRowCard,
    CaseStudiesRowContent,
} from '@/components/sections/case-studies-row';
import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * Map Sanity `caseStudiesRow` → CaseStudiesRow props (ADR-020 / WP2b).
 */
export function mapCaseStudiesRow(
    section: PageSectionCaseStudiesRowDoc,
): CaseStudiesRowContent {
    const cards: CaseStudiesRowCard[] = [];
    for (const [index, row] of (section.items ?? []).entries()) {
        const title = row?.title?.trim();
        const slug = row?.slug?.trim();
        if (!title || !slug) continue;

        const brand = row.clientName?.trim() || title;
        const tag = row.tag?.trim() || 'Case study';
        const imageSrc = row.cardImageUrl?.trim();

        cards.push({
            id: row._key?.trim() || `${row._id?.trim() || slug}-${index}`,
            brand,
            tag,
            title,
            href: `${WWW_ROUTES.caseStudies}/${slug}`,
            tone: index % 2 === 0 ? 'primary' : 'muted',
            ...(imageSrc
                ? {
                      image: {
                          src: imageSrc,
                          alt: row.cardImageAlt?.trim() || title,
                      },
                  }
                : {}),
        });
    }

    const chrome = mapSectionChrome(section);
    const headline = section.heading?.trim() || 'Case studies';
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
