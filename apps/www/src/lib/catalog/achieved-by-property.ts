/**
 * Reserved compatibility / builder key for reverse `achieves` technique pick.
 * URL: `?finishing=gloss&finishing.achievedBy=aq-coating-aqueous`
 */

export const ACHIEVED_BY_PROPERTY_KEY = 'achievedBy';

/**
 * Map URL values (technique slug or id) onto builder technique ids.
 * Unknown values are dropped so Need consultation is not faked.
 */
export function resolveAchievedByTechniqueIds(
    techniques: {id: string; slug?: string}[] | undefined,
    values: string[],
): string[] {
    if (!techniques?.length) return [];
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
        const needle = value.trim().toLowerCase();
        if (!needle) continue;
        const match = techniques.find(
            (item) =>
                item.id.toLowerCase() === needle ||
                item.slug?.trim().toLowerCase() === needle,
        );
        if (!match || seen.has(match.id)) continue;
        seen.add(match.id);
        ids.push(match.id);
    }
    return ids;
}
