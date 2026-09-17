/**
 * Product customization availability (PROD-2529).
 *
 * Pure policy-aware helpers: resolve product offer → expand derived categories →
 * filter by shopper selections. UI only consumes the result.
 */

import {
    CATEGORY_POLICIES,
    categorySortIndex,
    compareCategorySlugs,
    getDerivedCategorySlugs,
    type CategoryPolicy,
} from '@/lib/catalog/customization-category-policy';
import type {CustomizationOption} from '@/lib/catalog/types';

/** Stable offer DTO for availability (mirrors CustomizationOption fields we need). */
export type OfferOption = {
    optionId: string;
    typeId: string;
    categorySlug: string;
    categoryTitle?: string;
    categoryDescription?: string;
    typeSlug?: string;
    typeTitle?: string;
    typeDescription?: string;
    label: string;
    slug?: string;
    configuratorRole: 'configurable' | 'reference';
    customerSelects: 'one' | 'many';
    worksOnIds: string[];
    incompatibleIds: string[];
    preselected?: boolean;
    shortDescription?: string;
    description?: string;
    imageUrl?: string | null;
};

export type CompatibilityIndex = {
    /** optionId / typeId → worksOn target ids */
    worksOnById: Map<string, ReadonlySet<string>>;
    /** optionId / typeId → incompatible target ids */
    incompatibleById: Map<string, ReadonlySet<string>>;
};

export function toOfferOption(item: CustomizationOption): OfferOption | null {
    const categorySlug = item.category?.trim();
    if (!categorySlug || !item.id) return null;
    const role =
        item.configuratorRole === 'reference' || item.role === 'reference'
            ? 'reference'
            : 'configurable';
    if (role === 'reference') return null;
    const customerSelects =
        item.customerSelects === 'many' || item.cardinality === 'many'
            ? 'many'
            : 'one';
    return {
        optionId: item.id,
        typeId: item.typeId?.trim() || `fallback-${categorySlug}`,
        categorySlug,
        categoryTitle: item.categoryTitle,
        categoryDescription: item.categoryDescription,
        typeSlug: item.typeSlug,
        typeTitle: item.typeTitle,
        typeDescription: item.typeDescription,
        label: item.label,
        slug: item.slug,
        configuratorRole: 'configurable',
        customerSelects,
        worksOnIds: item.worksOnIds ?? [],
        incompatibleIds: item.incompatibleIds ?? [],
        ...(item.preselected ? {preselected: true} : {}),
        shortDescription: item.shortDescription,
        description: item.description,
        imageUrl: item.imageUrl,
    };
}

export function fromOfferOption(item: OfferOption): CustomizationOption {
    return {
        id: item.optionId,
        label: item.label,
        category: item.categorySlug,
        categoryTitle: item.categoryTitle,
        categoryDescription: item.categoryDescription,
        categoryOrder: categorySortIndex(item.categorySlug),
        typeId: item.typeId,
        typeSlug: item.typeSlug,
        typeTitle: item.typeTitle,
        typeDescription: item.typeDescription,
        customerSelects: item.customerSelects,
        cardinality: item.customerSelects,
        slug: item.slug,
        shortDescription: item.shortDescription,
        description: item.description,
        imageUrl: item.imageUrl,
        configuratorRole: item.configuratorRole,
        role: item.configuratorRole,
        ...(item.preselected ? {preselected: true} : {}),
        ...(item.worksOnIds.length > 0 ? {worksOnIds: item.worksOnIds} : {}),
        ...(item.incompatibleIds.length > 0
            ? {incompatibleIds: item.incompatibleIds}
            : {}),
    };
}

export function resolveOffer(
    productRows: CustomizationOption[],
    policy: readonly CategoryPolicy[] = CATEGORY_POLICIES,
): OfferOption[] {
    const out: OfferOption[] = [];
    const seen = new Set<string>();
    for (const row of productRows) {
        const offer = toOfferOption(row);
        if (!offer || seen.has(offer.optionId)) continue;
        seen.add(offer.optionId);
        out.push(offer);
    }
    // Policy is reserved for expand/sort; product rows already filtered by role.
    void policy;
    return out;
}

export function buildCompatibilityIndex(
    universe: OfferOption[],
): CompatibilityIndex {
    const worksOnById = new Map<string, ReadonlySet<string>>();
    const incompatibleById = new Map<string, ReadonlySet<string>>();
    for (const item of universe) {
        worksOnById.set(item.optionId, new Set(item.worksOnIds));
        incompatibleById.set(item.optionId, new Set(item.incompatibleIds));
        if (item.typeId) {
            // Type-level lookups share the option's edges when referenced by type id.
            const existingWorks = worksOnById.get(item.typeId);
            if (!existingWorks) {
                worksOnById.set(item.typeId, new Set(item.worksOnIds));
            }
            const existingIncompat = incompatibleById.get(item.typeId);
            if (!existingIncompat) {
                incompatibleById.set(item.typeId, new Set(item.incompatibleIds));
            }
        }
    }
    return {worksOnById, incompatibleById};
}

/**
 * Empty worksOn = no material restriction (Studio fail-open).
 * Non-empty = must intersect anchor option/type ids.
 */
export function worksOnAllows(
    candidate: OfferOption,
    anchorIds: ReadonlySet<string>,
): boolean {
    if (candidate.worksOnIds.length === 0) return true;
    if (anchorIds.size === 0) return false;
    return candidate.worksOnIds.some((id) => anchorIds.has(id));
}

export function clashesWith(
    candidate: OfferOption,
    selectedIds: ReadonlySet<string>,
    index?: CompatibilityIndex,
): boolean {
    if (selectedIds.size === 0) return false;
    const deny =
        index?.incompatibleById.get(candidate.optionId) ??
        new Set(candidate.incompatibleIds);
    for (const id of selectedIds) {
        if (deny.has(id)) return true;
        const reverse =
            index?.incompatibleById.get(id) ?? new Set<string>();
        if (reverse.has(candidate.optionId) || reverse.has(candidate.typeId)) {
            return true;
        }
    }
    return false;
}

function anchorIdsFromOffer(offer: OfferOption[]): Set<string> {
    const ids = new Set<string>();
    for (const item of offer) {
        ids.add(item.optionId);
        if (item.typeId) ids.add(item.typeId);
    }
    return ids;
}

/**
 * Add compatible options from derived categories (printing / finishing).
 * Does not write to Sanity — www-only expand of the product offer.
 */
export function expandDerivedOffer(
    offer: OfferOption[],
    universe: OfferOption[],
    policy: readonly CategoryPolicy[] = CATEGORY_POLICIES,
): OfferOption[] {
    const derivedSlugs = new Set(getDerivedCategorySlugs(policy));
    const baseIds = new Set(offer.map((item) => item.optionId));
    const anchors = anchorIdsFromOffer(
        offer.filter((item) => {
            const mode = policy.find((p) => p.slug === item.categorySlug)?.mode;
            return mode === 'product' || !derivedSlugs.has(item.categorySlug);
        }),
    );
    // If product already listed some derived options, include them as anchors too
    // for worksOn against materials only — worksOn is material-facing.
    const materialAnchors = anchorIdsFromOffer(
        offer.filter((item) => {
            const mode = policy.find((p) => p.slug === item.categorySlug)?.mode;
            return mode === 'product';
        }),
    );
    const worksOnAnchors = materialAnchors.size > 0 ? materialAnchors : anchors;

    const index = buildCompatibilityIndex(universe);
    const added: OfferOption[] = [];

    for (const candidate of universe) {
        if (!derivedSlugs.has(candidate.categorySlug)) continue;
        if (baseIds.has(candidate.optionId)) continue;
        if (candidate.configuratorRole !== 'configurable') continue;
        if (!worksOnAllows(candidate, worksOnAnchors)) continue;
        if (clashesWith(candidate, worksOnAnchors, index)) continue;
        added.push(candidate);
        baseIds.add(candidate.optionId);
    }

    return [...offer, ...added];
}

export type SelectionAnswers = Partial<
    Record<string, {optionId?: string; typeId?: string} | undefined>
>;

/**
 * Narrow derived options as the shopper picks answers.
 * Returns filtered offer + answer keys that are no longer valid.
 */
export function filterOfferBySelections(
    offer: OfferOption[],
    answers: SelectionAnswers,
    policy: readonly CategoryPolicy[] = CATEGORY_POLICIES,
): {offer: OfferOption[]; invalidAnswerKeys: string[]} {
    const derivedSlugs = new Set(getDerivedCategorySlugs(policy));
    const selectedIds = new Set<string>();
    for (const [key, answer] of Object.entries(answers)) {
        if (!answer?.optionId) continue;
        if (derivedSlugs.has(key)) continue;
        selectedIds.add(answer.optionId);
        if (answer.typeId) selectedIds.add(answer.typeId);
    }

    // Prefer product-authored material selections when present; else all
    // non-derived options still on the offer.
    const materialSelected = [...selectedIds];
    const productAuthored = offer.filter((item) => {
        const mode = policy.find((p) => p.slug === item.categorySlug)?.mode;
        return mode === 'product';
    });
    const worksOnAnchors =
        materialSelected.length > 0
            ? new Set(materialSelected)
            : anchorIdsFromOffer(productAuthored);

    const index = buildCompatibilityIndex(offer);
    const kept: OfferOption[] = [];
    const keptIds = new Set<string>();

    for (const item of offer) {
        if (!derivedSlugs.has(item.categorySlug)) {
            kept.push(item);
            keptIds.add(item.optionId);
            continue;
        }
        if (!worksOnAllows(item, worksOnAnchors)) continue;
        if (clashesWith(item, selectedIds, index)) continue;
        kept.push(item);
        keptIds.add(item.optionId);
    }

    const invalidAnswerKeys: string[] = [];
    for (const [key, answer] of Object.entries(answers)) {
        if (!answer?.optionId) continue;
        if (!derivedSlugs.has(key)) continue;
        if (!keptIds.has(answer.optionId)) invalidAnswerKeys.push(key);
    }

    return {offer: kept, invalidAnswerKeys};
}

export function sortOfferByPolicy(
    offer: OfferOption[],
    policy: readonly CategoryPolicy[] = CATEGORY_POLICIES,
): OfferOption[] {
    void policy;
    return [...offer].sort((a, b) =>
        compareCategorySlugs(a.categorySlug, b.categorySlug),
    );
}

/** Expand product customizations with derived-universe options; return catalog shape. */
export function expandProductCustomizations(
    productRows: CustomizationOption[],
    universeRows: CustomizationOption[],
    policy: readonly CategoryPolicy[] = CATEGORY_POLICIES,
): CustomizationOption[] {
    const base = resolveOffer(productRows, policy);
    const universe = resolveOffer(universeRows, policy);
    const expanded = expandDerivedOffer(base, universe, policy);
    return sortOfferByPolicy(expanded, policy).map(fromOfferOption);
}
