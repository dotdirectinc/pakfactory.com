import type {PageSectionStepsDoc} from '@pakfactory/sanity/queries';

import {mapSectionChrome, mapSectionCta} from '@/lib/sections/map-section-chrome';
import type {SectionAlign} from '@/lib/sections/map-section-chrome';

export type StepItem = {
    id: string;
    title: string;
    body?: string;
    link?: {label: string; href: string};
};

export type StepsContent = {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    items: StepItem[];
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
    cta?: {label: string; href: string};
};

/** Map Sanity `steps` → Steps props (PROD-2578). */
export function mapSteps(section: PageSectionStepsDoc): StepsContent {
    const items: StepItem[] = [];
    for (const [index, row] of (section.items ?? []).entries()) {
        const title = row?.title?.trim();
        if (!title) continue;
        const body = row.body?.trim();
        const link = mapSectionCta(row.link);
        items.push({
            id: row._key?.trim() || `step-${index}`,
            title,
            ...(body ? {body} : {}),
            ...(link ? {link} : {}),
        });
    }

    const chrome = mapSectionChrome(section);
    const heading = section.heading?.trim();
    const intro = section.intro?.trim();

    return {
        ...(chrome.eyebrow ? {eyebrow: chrome.eyebrow} : {}),
        ...(heading ? {heading} : {}),
        ...(intro ? {intro} : {}),
        items,
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        ...(chrome.cta ? {cta: chrome.cta} : {}),
    };
}
