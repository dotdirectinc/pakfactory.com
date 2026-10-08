/**
 * Compatibility matching (PROD-2921).
 *
 * ALL-OF reader of `@pakfactory/sanity/customization-rules`. Does not invent
 * new availability logic. Callers supply each product's base offer set
 * (from `resolveForProduct` or the product's own list when rules are absent).
 *
 * // TODO(PROD-2921): product-scoped property availability — property values
 * are carried through the URL but do not filter products in v1.
 */

import {
    buildCompatibilityIndex,
    type Catalog,
    type ProductDoc,
} from '@pakfactory/sanity/customization-rules';
import type {DependencyGraph} from '@pakfactory/sanity/customization-rules/resolve';
import {
    resolveWithSelections,
    type Selections,
} from '@pakfactory/sanity/customization-rules/selections';

export type CompatibilitySelectedOption = {
    optionId: string;
    typeId: string;
    /** Category slug from the URL / library. */
    category: string;
    optionSlug: string;
    title?: string;
};

export type CompatibilityProductInput = {
    productId: string;
    /** Option ids the product can offer before any choice (base set). */
    baseOfferIds: ReadonlySet<string>;
    /**
     * Rules product inputs for `resolveWithSelections`. When omitted and
     * `rules` is set, built from `baseOfferIds` alone (no exceptions).
     */
    rulesProduct?: ProductDoc;
};

export type CompatibilityRulesContext = {
    catalog: Catalog;
    graph: DependencyGraph;
};

export type CompatibilityPartialReason =
    | {kind: 'missing'; optionIds: string[]}
    | {kind: 'conflict'; optionIds: string[]; conflictsWith?: string[]};

export type CompatibilityFullMatch = {
    productId: string;
};

export type CompatibilityPartialMatch = {
    productId: string;
    matched: string[];
    missing: string[];
    reason: CompatibilityPartialReason;
};

export type CompatibilityMatchResult = {
    full: CompatibilityFullMatch[];
    partial: CompatibilityPartialMatch[];
    /** Selected option ids that no product was asked about (caller-known). */
    unknownSelections: CompatibilitySelectedOption[];
};

export type MatchCompatibilityOptions = {
    /**
     * Selections that could not be resolved to option ids (stale slugs).
     * Returned as `unknownSelections` without affecting matching.
     */
    unknownSelections?: CompatibilitySelectedOption[];
    /**
     * When false (or `rules` omitted), skip `resolveWithSelections` and treat
     * every product with a full base-set match as a full match. Use when the
     * dataset has no rules (`prepareRules` returned null).
     */
    rules?: CompatibilityRulesContext | null;
    /**
     * With a single selection, partial matches are omitted (no "m of n" group).
     * Defaults to true.
     */
    includePartialsWhenSingle?: boolean;
};

/**
 * Match products against selected options.
 *
 * 1. `matched` = selected option ids present in the product's base offer.
 * 2. `missing` = the rest.
 * 3. Candidates with `missing.length === 0` run `resolveWithSelections` when
 *    rules are available. Non-empty `invalidated` → partial with `conflict`.
 * 4. Otherwise → full match.
 * 5. Partials sorted by `matched.length` descending.
 */
export function matchCompatibility(
    products: CompatibilityProductInput[],
    selected: CompatibilitySelectedOption[],
    options: MatchCompatibilityOptions = {},
): CompatibilityMatchResult {
    const unknownSelections = options.unknownSelections ?? [];
    const known = selected.filter((s) => Boolean(s.optionId));
    const selectedIds = known.map((s) => s.optionId);
    const showPartials =
        known.length >= 2 || options.includePartialsWhenSingle === true;

    if (known.length === 0) {
        return {full: [], partial: [], unknownSelections};
    }

    const selections: Selections = {};
    for (const item of known) {
        if (!item.typeId) continue;
        (selections[item.typeId] ??= []).push(item.optionId);
    }

    const rules = options.rules ?? null;
    const index =
        rules != null
            ? buildCompatibilityIndex(rules.catalog.options)
            : undefined;

    const full: CompatibilityFullMatch[] = [];
    const partial: CompatibilityPartialMatch[] = [];

    for (const product of products) {
        const matched: string[] = [];
        const missing: string[] = [];
        for (const id of selectedIds) {
            if (product.baseOfferIds.has(id)) matched.push(id);
            else missing.push(id);
        }

        if (missing.length > 0) {
            if (showPartials && matched.length > 0) {
                partial.push({
                    productId: product.productId,
                    matched,
                    missing,
                    reason: {kind: 'missing', optionIds: missing},
                });
            }
            continue;
        }

        // Full base-set coverage. Confirm combination when rules exist.
        // TODO(PROD-2921): product-scoped property availability — do not filter
        // on property values here until the model supports it.
        if (rules && index && Object.keys(selections).length > 0) {
            const rulesProduct: ProductDoc = product.rulesProduct ?? {
                _id: product.productId,
                availableCustomizations: [...product.baseOfferIds].map(
                    (optionId) => ({optionId}),
                ),
            };
            const resolution = resolveWithSelections(
                rules.catalog,
                rulesProduct,
                rules.graph,
                selections,
                index,
            );
            if (resolution.invalidated.length > 0) {
                if (showPartials) {
                    const optionIds = resolution.invalidated.map(
                        (row) => row.optionId,
                    );
                    const conflictsWith = [
                        ...new Set(
                            resolution.invalidated.flatMap(
                                (row) => row.conflictsWith ?? [],
                            ),
                        ),
                    ];
                    partial.push({
                        productId: product.productId,
                        matched,
                        missing: optionIds,
                        reason: {
                            kind: 'conflict',
                            optionIds,
                            ...(conflictsWith.length
                                ? {conflictsWith}
                                : {}),
                        },
                    });
                }
                continue;
            }
        }

        full.push({productId: product.productId});
    }

    partial.sort((a, b) => b.matched.length - a.matched.length);

    return {full, partial, unknownSelections};
}
