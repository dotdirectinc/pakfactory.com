import type {PageSectionMediaFeatureDoc} from '@pakfactory/sanity/queries';

import {mapSectionChrome} from '@/lib/sections/map-section-chrome';

export type MediaPanelMapped = {
    heading: string;
    body?: string;
    cta?: {label: string; href: string};
    image?: {src: string; alt: string};
    borderTop: boolean;
    borderBottom: boolean;
};

/**
 * Map Sanity `mediaFeature` → MediaPanel props. Unlike `mapMediaFeature`, a
 * missing image is not fatal — the panel renders solid until one is added.
 * No heading → null.
 */
export function mapMediaPanel(
    section: PageSectionMediaFeatureDoc,
): MediaPanelMapped | null {
    const heading = section.heading?.trim();
    if (!heading) return null;
    const chrome = mapSectionChrome(section);
    const body = section.bodyPlain?.trim();
    const src = section.mediaSrc?.trim();
    return {
        heading,
        ...(body ? {body} : {}),
        ...(chrome.cta ? {cta: chrome.cta} : {}),
        ...(src
            ? {image: {src, alt: section.mediaAlt?.trim() || heading}}
            : {}),
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
    };
}
