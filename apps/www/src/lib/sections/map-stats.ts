import type {PageSectionStatsDoc} from '@pakfactory/sanity/queries';

import {mapSectionChrome, type SectionAlign} from '@/lib/sections/map-section-chrome';

export type StatItem = {id: string; value: string; label: string};

export type StatsContent = {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    items: StatItem[];
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
    cta?: {label: string; href: string};
};

/** Map Sanity `stats` → Stats props (PROD-2666). Items need a value and a label. */
export function mapStats(section: PageSectionStatsDoc): StatsContent {
    const items: StatItem[] = [];
    for (const [index, row] of (section.items ?? []).entries()) {
        const value = row?.value?.trim();
        const label = row?.label?.trim();
        if (!value || !label) continue;
        items.push({id: row._key?.trim() || `stat-${index}`, value, label});
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
