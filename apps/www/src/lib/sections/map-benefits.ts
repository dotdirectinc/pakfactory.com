import type {LucideIcon} from 'lucide-react';
import {
    CircleCheck,
    Gauge,
    Layers,
    Leaf,
    Lightbulb,
    PiggyBank,
    ShieldCheck,
    Target,
    Truck,
} from 'lucide-react';
import type {PageSectionBenefitsDoc} from '@pakfactory/sanity/queries';

import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import type {SectionAlign} from '@/lib/sections/map-section-chrome';

/**
 * Studio `benefit.symbol` (closed vocabulary, `apps/studio/schemas/sections/benefits.ts`)
 * → Lucide glyph. Add a value in both places together.
 */
const BENEFIT_ICONS: Record<string, LucideIcon> = {
    clarity: Lightbulb,
    cost: PiggyBank,
    risk: ShieldCheck,
    scale: Layers,
    sustainability: Leaf,
    speed: Gauge,
    quality: Target,
    delivery: Truck,
};

export type BenefitItem = {
    id: string;
    title: string;
    body?: string;
    icon: LucideIcon;
};

export type BenefitsContent = {
    eyebrow?: string;
    heading?: string;
    intro?: string;
    items: BenefitItem[];
    align: SectionAlign;
    borderTop: boolean;
    borderBottom: boolean;
    cta?: {label: string; href: string};
};

/** Map Sanity `benefits` → Benefits props (PROD-2577). */
export function mapBenefits(section: PageSectionBenefitsDoc): BenefitsContent {
    const items: BenefitItem[] = [];
    for (const [index, row] of (section.items ?? []).entries()) {
        const title = row?.title?.trim();
        if (!title) continue;
        const body = row.body?.trim();
        items.push({
            id: row._key?.trim() || `benefit-${index}`,
            title,
            ...(body ? {body} : {}),
            icon: (row.symbol && BENEFIT_ICONS[row.symbol]) || CircleCheck,
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
