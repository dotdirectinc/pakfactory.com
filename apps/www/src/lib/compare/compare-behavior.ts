import {COMPARE_GROUP_LIMIT} from '@/lib/compare/compare-ids';

/**
 * Compare bar behaviour (vault prd-website-compare.md §4.1, §10 Q2–Q3). Production defaults below.
 * - fifth: when a group is full (maxPerGroup), replace the oldest (with Undo) or ask "Replace which?".
 * - firstOpen: the first add of a session opens the bar once, so buyers learn where compare lives.
 * - maxPerGroup: soft ceiling for one comparison group (PROD-3307: 20). The /compare rail still
 *   shows at least COMPARE_GROUP_MAX (4) columns with empty Add slots.
 */
export type CompareBehavior = {fifth: 'replace' | 'ask'; firstOpen: boolean; maxPerGroup: number};

let behavior: CompareBehavior = {fifth: 'replace', firstOpen: true, maxPerGroup: COMPARE_GROUP_LIMIT};

export function getCompareBehavior(): CompareBehavior {
    return behavior;
}

export function setCompareBehavior(next: Partial<CompareBehavior>): void {
    behavior = {...behavior, ...next};
}
