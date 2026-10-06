/**
 * Prepend curated items, then fill from auto candidates — skip duplicates by key.
 * Empty featured → auto only. Cap optional (solution hero = 16).
 */
export function mergeFeaturedThenFill<T>(
    featured: readonly T[],
    auto: readonly T[],
    keyOf: (item: T) => string | null | undefined,
    cap?: number,
): T[] {
    const seen = new Set<string>();
    const out: T[] = [];

    const push = (item: T) => {
        const key = keyOf(item)?.trim();
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(item);
    };

    for (const item of featured) {
        push(item);
        if (cap != null && out.length >= cap) return out;
    }
    for (const item of auto) {
        push(item);
        if (cap != null && out.length >= cap) return out;
    }
    return out;
}
