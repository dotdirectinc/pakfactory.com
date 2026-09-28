import type {PageSectionLogoWallDoc} from '@pakfactory/sanity/queries';

import type {LogoWallContent} from '@/components/sections/logo-wall';
import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import type {SolutionLogoItem} from '@/lib/solutions/types';

/**
 * Map Sanity `logoWall` → LogoWall props (ADR-020 / WP2a).
 * Studio `intro` → React `subhead`. Skip clients without name + logo URL.
 */
export function mapLogoWall(
    section: PageSectionLogoWallDoc,
): LogoWallContent {
    const items: SolutionLogoItem[] = [];
    for (const row of section.items ?? []) {
        const name = row?.name?.trim();
        const imageSrc = row?.imageSrc?.trim();
        if (!name || !imageSrc) continue;
        const id = row._id?.trim() || name;
        const href = row.href?.trim();
        items.push({
            id,
            name,
            imageSrc,
            ...(href ? {href, linkLabel: name} : {}),
        });
    }

    const chrome = mapSectionChrome(section);
    const heading = section.heading?.trim();
    const subhead = section.intro?.trim();

    return {
        ...(heading ? {heading} : {}),
        ...(subhead ? {subhead} : {}),
        align: chrome.align,
        borderTop: chrome.borderTop,
        borderBottom: chrome.borderBottom,
        paddingBlock: chrome.paddingBlock,
        ...(chrome.cta ? {cta: chrome.cta} : {}),
        items,
    };
}
