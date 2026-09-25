/**
 * Narrow the builder's options as the customer chooses (PROD-2556).
 *
 * Runs `resolveWithSelections` from `@pakfactory/sanity/customization-rules` — the same rules
 * the server resolved the product with — on the product's small rules snapshot, with EVERY
 * pick in the builder: a category holds picks from several Types (Chipboard + Exterior Wrap;
 * Printing Method + Color System + Ink), each Type as many as its `customerSelects` allows.
 * The builder's picks are exactly the rules' `typeId → [optionId]` selections, so nothing is
 * translated or closed here:
 *
 *   A Type's list is narrowed by the OTHER Types' picks, never its own, so the customer can
 *   change their mind within it. A Type nobody has answered yet still counts as possible —
 *   Color System stays pickable before Printing Method is chosen, because it can still be.
 *
 *   What is listed is exactly what can be picked: an option the rules report as available
 *   survives being chosen. Only a LATER pick elsewhere can invalidate it, and then the
 *   builder clears it.
 *
 * An earlier version closed every other Type in an answered category, to fit a one-answer-
 * per-category builder. That made Color System (needs Printing Method), Printing Method
 * (needs Ink) and Spot Coating (needs a Lamination or Surface Finish) impossible to keep: all
 * three were listed, then cleared the moment they were picked.
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
import {answerSelections} from '@/lib/customization-builder/state';
import type {CatalogOptionLike, CustomizationBuilderState} from '@/lib/customization-builder/types';

export type NarrowedOptions<T extends CatalogOptionLike> = {
    /** The options still available given the customer's other picks. */
    available: T[];
    /** Picked options another pick has made impossible. The builder clears them. */
    invalidOptionIds: Set<string>;
};

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

/** Every pick in the builder → the rules' `typeId → [optionId]` selections (real ids). */
export function selectionsFromState(state: CustomizationBuilderState): Selections {
    const out: Selections = {};
    for (const answer of Object.values(state.answers ?? {})) {
        for (const {typeId, optionId} of answerSelections(answer)) {
            if (typeId && optionId) (out[typeId] ??= []).push(optionId);
        }
    }
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

export function narrowByRules<T extends CatalogOptionLike>(
    available: T[],
    rules: CustomizationRulesSnapshot | null | undefined,
    state: CustomizationBuilderState,
): NarrowedOptions<T> {
    if (!rules) return {available, invalidOptionIds: new Set()};

    const {toToken, toId} = tokensFor(rules);
    // The rules see tokens; a pick the snapshot does not know keeps its id and is reported
    // as not offered.
    const selections: Selections = {};
    for (const [typeId, ids] of Object.entries(selectionsFromState(state))) {
        selections[typeId] = ids.map((id) => toToken.get(id) ?? id);
    }

    const resolution = resolveWithSelections(
        {types: rules.types, options: rules.options},
        {
            _id: 'product',
            availableCustomizations: rules.product.available.map((optionId) => ({optionId})),
            customizationExceptions: rules.product.exceptions,
        },
        graphFor(rules),
        selections,
    );

    const standing = new Set<string>();
    for (const ids of resolution.availableByType.values()) {
        for (const id of ids) standing.add(id);
    }
    const narrowed = available.filter((option) => {
        const token = toToken.get(option.id);
        return token !== undefined && standing.has(token);
    });

    const invalidOptionIds = new Set<string>(
        [...resolution.invalidated, ...resolution.notOffered].map((i) => toId.get(i.optionId) ?? i.optionId),
    );
    return {available: narrowed, invalidOptionIds};
}
