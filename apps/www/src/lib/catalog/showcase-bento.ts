import type {CustomizationShowcaseTile} from '@/lib/catalog/types';

export const SHOWCASE_BENTO_SLOT_COUNT = 5;

/**
 * Up to 5 showcase tiles: solutions first, then case studies.
 * Placement (lg): 0 mid-top, 1 top-right, 2 mid-left, 3 large right
 * (col-span 2 + row-span 2), 4 bottom-left.
 */
export function fillShowcaseBentoSlots(
    solutions: CustomizationShowcaseTile[],
    caseStudies: CustomizationShowcaseTile[],
): CustomizationShowcaseTile[] {
    return [...solutions, ...caseStudies].slice(0, SHOWCASE_BENTO_SLOT_COUNT);
}
