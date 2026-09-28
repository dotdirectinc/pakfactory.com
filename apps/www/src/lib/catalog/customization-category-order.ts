/**
 * Display order of customization categories on www — presentation only (PROD-2556).
 *
 * This file used to be the category POLICY: it hard-coded which categories the product
 * decides and which are derived, and www's availability code ran on it. That is now a fact
 * on each Customization Type (`availabilityDecidedBy`, PROD-2532) and is applied by
 * `@pakfactory/sanity/customization-rules`, so none of it lives here any more. What is left is
 * the order categories appear in, because `customizationCategory.order` was removed from the
 * model (2026-09-11) and the builder rail and the /customizations tabs still need one.
 *
 * Materials first because a customer chooses the board before anything is applied to it.
 */

/** Step key for the builder's dimensions step, which comes before every category. */
const DISPLAY_ORDER = ['dimensions', 'materials', 'printing', 'finishing', 'additional-customization'] as const;

const indexBySlug = new Map<string, number>(DISPLAY_ORDER.map((slug, index) => [slug, index]));

/** Position for a known slug; unknown categories sort after the known ones. */
export function categorySortIndex(slug: string): number {
    return indexBySlug.get(slug.trim()) ?? Number.MAX_SAFE_INTEGER;
}

export function compareCategorySlugs(a: string, b: string): number {
    const ai = categorySortIndex(a);
    const bi = categorySortIndex(b);
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
}
