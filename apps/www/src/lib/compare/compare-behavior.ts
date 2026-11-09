/**
 * Compare bar behaviour (vault prd-website-compare.md §4.1, §10 Q2–Q3). Production defaults below.
 * - fifth: a fifth item in a full group replaces the oldest (with Undo) or asks "Replace which?".
 * - firstOpen: the first add of a session opens the bar once, so buyers learn where compare lives.
 * - maxPerGroup: how many items one comparison holds (owner Nov 9: configurable, later a Sanity
 *   setting; R44's 4 is the default). The /compare page always shows at least 4 columns.
 */
export type CompareBehavior = {fifth: 'replace' | 'ask'; firstOpen: boolean; maxPerGroup: number};

let behavior: CompareBehavior = {fifth: 'replace', firstOpen: true, maxPerGroup: 4};

export function getCompareBehavior(): CompareBehavior {
    return behavior;
}

export function setCompareBehavior(next: Partial<CompareBehavior>): void {
    behavior = {...behavior, ...next};
}
