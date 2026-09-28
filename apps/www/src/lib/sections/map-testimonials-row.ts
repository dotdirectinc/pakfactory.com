import type {PageSectionTestimonialsRowDoc} from '@pakfactory/sanity/queries';
import type {PageDielinePaddingBlock} from '@pakfactory/ui/components/page-dieline-section';

import {
    mapSectionChrome,
    type SectionAlign,
} from '@/lib/sections/map-section-chrome';

export type TestimonialsLayoutVariant = 'carousel' | 'marquee';
export type TestimonialsAggregatePlacement = 'footer' | 'eyebrow';

/**
 * Map Sanity `testimonialsRow` chrome → section props.
 * Quote items + aggregate come from live Google Places (see getGooglePlaceReviews).
 */
export function mapTestimonialsRow(section: PageSectionTestimonialsRowDoc): {
    heading?: string;
    intro?: string;
    eyebrow?: string;
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
    paddingBlock: PageDielinePaddingBlock;
    cta?: {label: string; href: string};
    layoutVariant: TestimonialsLayoutVariant;
    aggregatePlacement: TestimonialsAggregatePlacement;
} {
    const chrome = mapSectionChrome(section);
    const heading = section.heading?.trim();
    const intro = section.intro?.trim();

    return {
        ...(heading ? {heading} : {}),
        ...(intro ? {intro} : {}),
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {}),
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        paddingBlock: chrome.paddingBlock,
        ...(chrome.cta ? {cta: chrome.cta} : {}),
        layoutVariant:
            section.layoutVariant === 'marquee' ? 'marquee' : 'carousel',
        aggregatePlacement:
            section.aggregatePlacement === 'eyebrow' ? 'eyebrow' : 'footer',
    };
}
