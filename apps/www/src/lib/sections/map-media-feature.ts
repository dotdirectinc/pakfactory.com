import type {PageSectionMediaFeatureDoc} from '@pakfactory/sanity/queries';

import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import type {SectionAlign} from '@/lib/sections/map-section-chrome';

export type MediaFeatureMapped = {
    title: string;
    body?: string;
    image: {src: string; alt: string};
    eyebrow?: string;
    cta?: {label: string; href: string};
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
};

/**
 * Map Sanity `mediaFeature` → TextWithImage props (ADR-020 / WP2b).
 */
export function mapMediaFeature(
    section: PageSectionMediaFeatureDoc,
): MediaFeatureMapped | null {
    const mediaSrc = section.mediaSrc?.trim();
    if (!mediaSrc) return null;

    const chrome = mapSectionChrome(section);
    const heading = section.heading?.trim() || 'Feature';
    const body = section.bodyPlain?.trim();
    const mediaAlt = section.mediaAlt?.trim() || heading;

    return {
        title: heading,
        ...(body ? {body} : {}),
        image: {src: mediaSrc, alt: mediaAlt},
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {}),
        ...(chrome.cta ? {cta: chrome.cta} : {}),
    };
}
