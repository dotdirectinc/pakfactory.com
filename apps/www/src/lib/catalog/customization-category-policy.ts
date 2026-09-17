/**
 * Www category availability policy (PROD-2529 / Studio picker parity).
 *
 * Studio still hardcodes PRODUCT_DICTATED_CATEGORIES on the product picker;
 * when Category gains an authored field (or Registry sends policy), replace
 * {@link CATEGORY_POLICIES} via a mapper — call sites keep using these helpers.
 */

export type CategoryAvailabilityMode = 'product' | 'derived' | 'code';

export type CategoryPolicy = {
    slug: string;
    mode: CategoryAvailabilityMode;
    sortIndex: number;
};

/** Seed matching Studio AvailableCustomizationsInput + builder Dimensions. */
export const CATEGORY_POLICIES: readonly CategoryPolicy[] = [
    {slug: 'dimensions', mode: 'code', sortIndex: 0},
    {slug: 'materials', mode: 'product', sortIndex: 1},
    {slug: 'printing', mode: 'derived', sortIndex: 2},
    {slug: 'finishing', mode: 'derived', sortIndex: 3},
    {slug: 'additional-customization', mode: 'product', sortIndex: 4},
] as const;

const bySlug = new Map(CATEGORY_POLICIES.map((row) => [row.slug, row]));

export function getCategoryPolicy(slug: string): CategoryPolicy | undefined {
    return bySlug.get(slug.trim());
}

export function getDerivedCategorySlugs(
    policy: readonly CategoryPolicy[] = CATEGORY_POLICIES,
): string[] {
    return policy.filter((row) => row.mode === 'derived').map((row) => row.slug);
}

export function getProductAuthoredCategorySlugs(
    policy: readonly CategoryPolicy[] = CATEGORY_POLICIES,
): string[] {
    return policy.filter((row) => row.mode === 'product').map((row) => row.slug);
}

/** SortIndex for known slugs; unknown categories sort after seeded ones. */
export function categorySortIndex(slug: string): number {
    return getCategoryPolicy(slug)?.sortIndex ?? Number.MAX_SAFE_INTEGER;
}

export function compareCategorySlugs(a: string, b: string): number {
    const ai = categorySortIndex(a);
    const bi = categorySortIndex(b);
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
}
