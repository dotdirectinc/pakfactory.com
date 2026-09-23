import type {PageSectionExpertiseSequenceDoc} from '@pakfactory/sanity/queries';

import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import type {
    ExpertiseRowContent,
    ExpertiseRowStage,
} from '@/lib/solutions/types';
import {WWW_ROUTES} from '@/lib/www-routes';

/**
 * Map Sanity `expertiseSequence` → ExpertiseRow props (ADR-020 / WP2b).
 */
export function mapExpertiseSequence(
    section: PageSectionExpertiseSequenceDoc,
): ExpertiseRowContent {
    const stages: ExpertiseRowStage[] = [];
    for (const row of section.stages ?? []) {
        const title = row?.title?.trim();
        if (!title) continue;
        const slug = row.slug?.trim();
        const id = row._id?.trim() || slug || title;
        const body =
            row.description?.trim() || row.tagline?.trim() || undefined;
        const diagramSrc = row.diagramSrc?.trim();
        const href = slug
            ? `${WWW_ROUTES.expertise}/${slug}`
            : undefined;

        stages.push({
            id,
            title,
            ...(body ? {body} : {}),
            ...(href
                ? {cta: {label: 'Learn more', href}}
                : {}),
            ...(diagramSrc
                ? {
                      media: {
                          src: diagramSrc,
                          alt: row.diagramAlt?.trim() || title,
                      },
                  }
                : {mediaPlaceholder: title}),
        });
    }

    const chrome = mapSectionChrome(section);
    const headline = section.heading?.trim() || 'Expertise';
    const description = section.intro?.trim();

    return {
        headline,
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        ...(description ? {description} : {}),
        ...(chrome.cta ? {cta: chrome.cta} : {}),
        stages,
    };
}
