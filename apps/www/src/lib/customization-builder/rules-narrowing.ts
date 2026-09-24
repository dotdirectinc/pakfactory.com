/**
 * Narrow the builder's options as the customer chooses (PROD-2556).
 *
 * Runs `resolveWithSelections` from `@pakfactory/sanity/customization-rules` — the same rules
 * the server resolved the product with — on the product's small rules snapshot. The builder
 * keeps its designed shape: ONE answer per category step. The rules work per type, so that
 * design is expressed to them here:
 *
 *   An answered category is CLOSED. Choosing Tinplate under Materials means the material is
 *   Tinplate — the category's other types (Fabric, Paperboard…) are not chosen, so they can
 *   no longer keep anything available. Without this, a product offering tin and canvas would
 *   keep Heat Transfer Printing (canvas-only) after the customer picked tinplate.
 *
 *   A step still lists its own alternatives. The options shown for a category are narrowed by
 *   the OTHER categories' answers only, so the customer can change their mind within it —
 *   the same rule the package applies to a type's own selection.
 *
 * No snapshot (production until its catalog is rebuilt, or a request line saved before this
 * shipped) means no narrowing: the options are shown as resolved.
 */

import {buildDependencyGraph} from '@pakfactory/sanity/customization-rules/dependencies';
import {
    resolveWithSelections,
    type Selections,
} from '@pakfactory/sanity/customization-rules/selections';
import type {CustomizationRulesSnapshot} from '@/lib/catalog/customization-rules';
import type {CatalogOptionLike, CustomizationBuilderState} from '@/lib/customization-builder/types';

export type NarrowedOptions<T extends CatalogOptionLike> = {
    /** The options still available given the customer's other answers. */
    available: T[];
    /** Chosen options another answer has made impossible. The builder clears them. */
    invalidOptionIds: Set<string>;
};

type Answer = {typeId: string; optionId: string};

/** Real option id ↔ the snapshot's compact token (see CustomizationRulesSnapshot.ids). */
const tokensCache = new WeakMap<CustomizationRulesSnapshot, {toToken: Map<string, string>; toId: Map<string, string>}>();
function tokensFor(rules: CustomizationRulesSnapshot) {
    let t = tokensCache.get(rules);
    if (!t) {
        const ids = rules.ids ?? [];
        t = {
            toToken: new Map(ids.map((id, n) => [id, n.toString(36)])),
            toId: new Map(ids.map((id, n) => [n.toString(36), id])),
        };
        tokensCache.set(rules, t);
    }
    return t;
}

function answersFromState(state: CustomizationBuilderState): Answer[] {
    const out: Answer[] = [];
    for (const answer of Object.values(state.answers ?? {})) {
        if (!answer || answer.status !== 'set' || !('selection' in answer)) continue;
        const {typeId, optionId} = answer.selection;
        if (typeId && optionId) out.push({typeId, optionId});
    }
    return out;
}

/** One answer per category step → the rules' `typeId → [optionId]` selections. */
export function selectionsFromState(state: CustomizationBuilderState): Selections {
    const out: Selections = {};
    for (const {typeId, optionId} of answersFromState(state)) (out[typeId] ??= []).push(optionId);
    return out;
}

const graphCache = new WeakMap<CustomizationRulesSnapshot, ReturnType<typeof buildDependencyGraph>>();

function graphFor(rules: CustomizationRulesSnapshot) {
    let graph = graphCache.get(rules);
    if (!graph) {
        graph = buildDependencyGraph({types: rules.types, options: rules.options});
        graphCache.set(rules, graph);
    }
    return graph;
}

/**
 * Resolve with every answer except those in `skipCategory`, each answered category closed:
 * its unchosen product-decided types drop out of the product's list, and its unchosen
 * customization-decided options are taken out for this product only.
 */
function resolveWith(
    rules: CustomizationRulesSnapshot,
    answers: Answer[],
    skipCategory: string | null,
) {
    const categoryOfType = new Map(rules.types.map((t) => [t._id, t.categoryId ?? null]));
    const decidedBy = new Map(rules.types.map((t) => [t._id, t.availabilityDecidedBy]));
    const typeOfOption = new Map(rules.options.map((o) => [o._id, o.typeId]));

    const selections: Selections = {};
    const chosenTypeInCategory = new Map<string, string>();
    for (const {typeId, optionId} of answers) {
        const category = categoryOfType.get(typeId) ?? null;
        if (category && category === skipCategory) continue;
        (selections[typeId] ??= []).push(optionId);
        if (category) chosenTypeInCategory.set(category, typeId);
    }

    const closed = (optionId: string) => {
        const typeId = typeOfOption.get(optionId);
        if (!typeId) return false;
        const category = categoryOfType.get(typeId);
        if (!category) return false;
        const chosen = chosenTypeInCategory.get(category);
        return chosen !== undefined && chosen !== typeId;
    };

    const available = rules.product.available.filter((id) => !closed(id));
    const exceptions = rules.product.exceptions.filter((e) => !closed(e.optionId));
    for (const o of rules.options) {
        if (closed(o._id) && decidedBy.get(o.typeId) === 'customization') {
            exceptions.push({optionId: o._id, mode: 'remove'});
        }
    }
    return resolveWithSelections(
        {types: rules.types, options: rules.options},
        {_id: 'product', availableCustomizations: available.map((optionId) => ({optionId})), customizationExceptions: exceptions},
        graphFor(rules),
        selections,
    );
}

export function narrowByRules<T extends CatalogOptionLike>(
    available: T[],
    rules: CustomizationRulesSnapshot | null | undefined,
    state: CustomizationBuilderState,
): NarrowedOptions<T> {
    if (!rules) return {available, invalidOptionIds: new Set()};

    const {toToken, toId} = tokensFor(rules);
    // The rules see tokens; an answer the snapshot does not know keeps its id and is ignored.
    const answers = answersFromState(state).map((a) => ({...a, optionId: toToken.get(a.optionId) ?? a.optionId}));
    const categoryOfType = new Map(rules.types.map((t) => [t._id, t.categoryId ?? null]));

    // What each category's step lists: narrowed by every OTHER category's answer.
    const standingByCategory = new Map<string | null, Set<string>>();
    const standingFor = (category: string | null) => {
        let standing = standingByCategory.get(category);
        if (!standing) {
            standing = new Set<string>();
            for (const ids of resolveWith(rules, answers, category).availableByType.values()) {
                for (const id of ids) standing.add(id);
            }
            standingByCategory.set(category, standing);
        }
        return standing;
    };

    const narrowed = available.filter((option) => {
        const category = option.typeId ? (categoryOfType.get(option.typeId) ?? null) : null;
        const token = toToken.get(option.id);
        return token !== undefined && standingFor(category).has(token);
    });

    // With every answer applied, which chosen options can no longer be made.
    const full = resolveWith(rules, answers, null);
    const invalidOptionIds = new Set<string>(
        [...full.invalidated, ...full.notOffered].map((i) => toId.get(i.optionId) ?? i.optionId),
    );
    return {available: narrowed, invalidOptionIds};
}
