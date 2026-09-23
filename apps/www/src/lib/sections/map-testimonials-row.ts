import type {PageSectionTestimonialsRowDoc} from '@pakfactory/sanity/queries';
import type {PageDielinePaddingBlock} from '@pakfactory/ui/components/page-dieline-section';

import {
    MOCK_PRODUCT_TESTIMONIALS,
    MOCK_TESTIMONIALS_AGGREGATE,
} from '@/lib/catalog/mock-testimonials';
import type {
    ProductTestimonial,
    TestimonialsAggregate,
} from '@/lib/catalog/types';
import {
    mapSectionChrome,
    type SectionAlign,
} from '@/lib/sections/map-section-chrome';

/**
 * Map Sanity `testimonialsRow` → TestimonialsRow props.
 * Quote items stay mock until shared `testimonial` docs land.
 */
export function mapTestimonialsRow(section: PageSectionTestimonialsRowDoc): {
    heading?: string;
    intro?: string;
    eyebrow?: string;
    items: ProductTestimonial[];
    aggregate: TestimonialsAggregate;
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
    paddingBlock: PageDielinePaddingBlock;
    cta?: {label: string; href: string};
} {
    const chrome = mapSectionChrome(section);
    const heading = section.heading?.trim();
    const intro = section.intro?.trim();

    return {
        ...(heading ? {heading} : {}),
        ...(intro ? {intro} : {}),
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {}),
        items: MOCK_PRODUCT_TESTIMONIALS,
        aggregate: MOCK_TESTIMONIALS_AGGREGATE,
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        paddingBlock: chrome.paddingBlock,
        ...(chrome.cta ? {cta: chrome.cta} : {}),
    };
}
