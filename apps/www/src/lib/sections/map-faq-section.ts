import type {PageSectionFaqSectionDoc} from '@pakfactory/sanity/queries';

import type {ProductFaq} from '@/lib/catalog/types';
import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import type {SectionAlign} from '@/lib/sections/map-section-chrome';

/**
 * Map Sanity `faqSection` → FaqSection props (ADR-020 / WP1).
 * Align defaults to center when unset (historical FAQ layout).
 */
export function mapFaqSection(section: PageSectionFaqSectionDoc): {
    heading?: string;
    intro?: string;
    items: ProductFaq[];
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
    cta?: {label: string; href: string};
} {
    const items: ProductFaq[] = [];
    for (const row of section.faqs ?? []) {
        const question = row?.question?.trim();
        const answerPlain = row?.answerPlain?.trim();
        if (!question || !answerPlain) continue;
        items.push({question, answerPlain});
    }

    const chrome = mapSectionChrome(section);
    const heading = section.heading?.trim();
    const intro = section.intro?.trim();
    const align =
        section.align === 'left' || section.align === 'center'
            ? chrome.align
            : 'center';

    return {
        ...(heading ? {heading} : {}),
        ...(intro ? {intro} : {}),
        items,
        align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        ...(chrome.cta ? {cta: chrome.cta} : {}),
    };
}
