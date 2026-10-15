import type {PageSectionPressReleasesRowDoc} from '@pakfactory/sanity/queries';

import type {PressReleasesRowProps} from '@/components/sections/press-releases-row';
import {mapNewsCards} from '@/lib/newsroom/map-sanity';
import {mapSectionChrome} from '@/lib/sections/map-section-chrome';
import {WWW_ROUTES} from '@/lib/www-routes';

export const PRESS_RELEASES_ROW_DEFAULT_HEADING = 'More announcements';
export const PRESS_RELEASES_ROW_DEFAULT_CTA = 'See all announcements';

/**
 * Sanity `pressReleasesRow` → `PressReleasesRow` props. Heading and the
 * "See all" link fall back to the design copy (the link goes to the listing
 * unless an editor sets their own). The link shows only when more releases
 * exist than the row lists (`hasMore`, set where the row is filled) — with
 * everything already on screen it would lead nowhere new.
 */
export function mapPressReleasesRow(
    section: PageSectionPressReleasesRowDoc,
): Omit<PressReleasesRowProps, 'id'> {
    const chrome = mapSectionChrome(section);
    const intro = section.intro?.trim();
    return {
        heading: section.heading?.trim() || PRESS_RELEASES_ROW_DEFAULT_HEADING,
        ...(intro ? {intro} : {}),
        items: mapNewsCards(section.items),
        cta: section.hasMore
            ? (chrome.cta ?? {
                  label: PRESS_RELEASES_ROW_DEFAULT_CTA,
                  href: WWW_ROUTES.newsroom,
              })
            : undefined,
        paddingBlock: chrome.paddingBlock,
        borderTop: section.showTopBorder ?? true,
        borderBottom: section.showBottomBorder ?? false,
    };
}
