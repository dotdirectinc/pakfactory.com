/**
 * Product customization availability from the shared rules (PROD-2556).
 *
 * www used to decide this itself — `customization-availability.ts` read two fields Studio had
 * retired, found them empty, treated empty as "allowed", and so offered every printing and
 * finishing option on every product. It now asks `@pakfactory/sanity/customization-rules`,
 * the same package Studio's Customization tab uses, so the site and Studio cannot disagree.
 *
 * Pure: no fetching, no `server-only`. `catalog.ts` fetches and caches the rules catalog and
 * calls {@link resolveProductCustomizations} per product; the builder narrows on the client
 * from the small {@link CustomizationRulesSnapshot} this returns.
 */

import {
    buildDependencyGraph,
    type CatalogWithDependencies,
    type CustomizationTypeWithDependencies,
} from '@pakfactory/sanity/customization-rules/dependencies';
import {resolveForProduct} from '@pakfactory/sanity/customization-rules/resolve';
import type {
    CatalogCustomizationRulesDoc,
    CatalogRulesOptionDoc,
    CatalogRulesProductDoc,
} from '@pakfactory/sanity/queries';
import type {CustomizationOption} from '@/lib/catalog/types';

/**
 * The rules for ONE product, small enough to ship to the browser: every type (a category
 * requirement expands to its member types, so no type can be dropped), the options this
 * product can offer with their compatible lists cut down to each other, and the product's
 * own inputs. The builder runs `resolveWithSelections` on it as the customer chooses.
 */
export type CustomizationRulesSnapshot = {
    types: CustomizationTypeWithDependencies[];
    /**
     * Option ids are COMPACT tokens (`ids[n]` is the real id of token `n`), and each
     * compatible pair is stored once, on the earlier option — the rules read pairs from both
     * ends. A dense product (a rigid box offers ~90 options, most paired with most) is ~15k
     * pairs; with full document ids that was 266 KB per product, in the page and in every
     * saved request line.
     */
    ids: string[];
    options: {_id: string; typeId: string; compatibleCustomizations: string[]}[];
    product: {
        available: string[];
        exceptions: {optionId: string; mode: 'add' | 'remove'; reason?: string}[];
    };
};

export type PreparedRules = {
    catalog: CatalogWithDependencies;
    graph: ReturnType<typeof buildDependencyGraph>;
    optionDocs: Map<string, CatalogRulesOptionDoc>;
};

/**
 * Stands in for pairs that pruning removed, so an option that has compatible options
 * elsewhere in the catalog stays ELIGIBLE (the rules drop an option with no pairs at all).
 * Names nothing, so it never counts as a partner.
 */
export const PRUNED_PAIRS_MARKER = '__pruned__';

const published = (id: string) => id.replace(/^drafts\./, '');
const ids = (list: (string | null | undefined)[] | null | undefined): string[] =>
    (list ?? []).filter((id): id is string => Boolean(id)).map(published);

/**
 * Shape the fetched rules catalog for the package, or null when the dataset holds no rules
 * yet. Production has no `compatibleCustomizations` and no `dependsOn` until its catalog is
 * rebuilt, and the rules FAIL CLOSED — empty compatible means "combines with nothing" — so
 * applying them there would take every printing and finishing option off every product.
 * Until the data exists, callers keep what each product lists directly.
 */
export function prepareRules(
    doc: CatalogCustomizationRulesDoc | null | undefined,
): PreparedRules | null {
    const types: CustomizationTypeWithDependencies[] = [];
    for (const t of doc?.types ?? []) {
        if (!t?._id) continue;
        if (t.availabilityDecidedBy !== 'product' && t.availabilityDecidedBy !== 'customization') continue;
        types.push({
            _id: t._id,
            ...(t.title ? {title: t.title} : {}),
            availabilityDecidedBy: t.availabilityDecidedBy,
            // Only a `many` type's picks are checked against each other (Ink, Embossing).
            ...(t.customerSelects === 'many' ? {customerSelects: 'many' as const} : {}),
            ...(t.categoryId ? {categoryId: t.categoryId} : {}),
            requirements: (t.requirements ?? [])
                .map((group) => ids(group))
                .filter((group) => group.length > 0),
        });
    }
    const optionDocs = new Map<string, CatalogRulesOptionDoc>();
    const options: CatalogWithDependencies['options'] = [];
    for (const o of doc?.options ?? []) {
        if (!o?._id || !o.typeId) continue;
        optionDocs.set(o._id, o);
        options.push({
            _id: o._id,
            ...(o.title ? {title: o.title} : {}),
            typeId: published(o.typeId),
            compatibleCustomizations: ids(o.compatibleCustomizations),
        });
    }
    const ready =
        options.some((o) => (o.compatibleCustomizations?.length ?? 0) > 0) &&
        types.some((t) => (t.requirements?.length ?? 0) > 0);
    if (!ready) return null;
    const catalog = {types, options};
    return {catalog, graph: buildDependencyGraph(catalog), optionDocs};
}

export type ResolvedCustomizations = {
    /** What the product offers, in the shape the PDP and builder already use. */
    availableCustomizations: CustomizationOption[];
    customizationRules: CustomizationRulesSnapshot;
};

/**
 * What one product offers: its own list plus everything the rules derive from it, with its
 * exceptions applied. A preset's `available` and `exceptions` are its base product's (the
 * query reads them through `basedOn`); `preselectedIds` are the preset's own.
 *
 * `mapOption` turns an option document into the catalog shape and drops what the customer
 * never sees (reference options, inactive ones). Reference options stay in the snapshot: they
 * can still be the partner that keeps another option available.
 */
export function resolveProductCustomizations(
    rules: PreparedRules,
    input: {
        rulesProduct: CatalogRulesProductDoc | null | undefined;
        preselectedIds: (string | null)[] | null | undefined;
        productId: string;
    },
    mapOption: (doc: CatalogRulesOptionDoc, preselected: boolean) => CustomizationOption | null,
): ResolvedCustomizations {
    const available = ids(input.rulesProduct?.available);
    const exceptions = (input.rulesProduct?.exceptions ?? [])
        .filter(
            (e): e is {optionId: string; mode: 'add' | 'remove'; reason?: string | null} =>
                Boolean(e?.optionId) && (e?.mode === 'add' || e?.mode === 'remove'),
        )
        .map((e) => ({
            optionId: published(e.optionId),
            mode: e.mode,
            ...(e.reason ? {reason: e.reason} : {}),
        }));
    const product = {
        _id: input.productId,
        availableCustomizations: available.map((optionId) => ({optionId})),
        customizationExceptions: exceptions,
    };
    const resolution = resolveForProduct(rules.catalog, product, rules.graph);

    const resolvedIds = new Set<string>();
    for (const optionIds of resolution.availableByType.values()) {
        for (const id of optionIds) resolvedIds.add(id);
    }

    const preselected = new Set(ids(input.preselectedIds));
    const availableCustomizations: CustomizationOption[] = [];
    for (const id of resolvedIds) {
        const doc = rules.optionDocs.get(id);
        if (!doc) continue;
        const mapped = mapOption(doc, preselected.has(id));
        if (mapped) availableCustomizations.push(mapped);
    }

    return {
        availableCustomizations,
        customizationRules: buildSnapshot(rules.catalog, resolvedIds, available, exceptions),
    };
}

/**
 * Keep only the options this product can offer, and only the pairs between them. Anything
 * outside that set is never available on this product, so it can never be the partner that
 * keeps a selection alive — the narrowed answer is the same with or without it. Then encode
 * ids as compact tokens and keep each pair once (see {@link CustomizationRulesSnapshot}).
 */
function buildSnapshot(
    catalog: CatalogWithDependencies,
    keep: ReadonlySet<string>,
    available: string[],
    exceptions: CustomizationRulesSnapshot['product']['exceptions'],
): CustomizationRulesSnapshot {
    // Eligibility is judged on the FULL catalog, from both ends of every pair.
    const paired = new Set<string>();
    for (const o of catalog.options) {
        const list = o.compatibleCustomizations ?? [];
        if (list.length === 0) continue;
        paired.add(o._id);
        for (const id of list) paired.add(id);
    }

    const kept = catalog.options.filter((o) => keep.has(o._id));
    const ids = kept.map((o) => o._id);
    const tokenOf = new Map(ids.map((id, n) => [id, n.toString(36)]));
    const position = new Map(ids.map((id, n) => [id, n]));
    const pairs = new Map<string, Set<string>>(ids.map((id) => [id, new Set<string>()]));
    for (const o of kept) {
        for (const other of o.compatibleCustomizations ?? []) {
            if (!keep.has(other) || other === o._id) continue;
            // Symmetric: store once, on whichever of the two comes first.
            const [a, b] = position.get(o._id)! < position.get(other)! ? [o._id, other] : [other, o._id];
            pairs.get(a)!.add(tokenOf.get(b)!);
        }
    }
    const hasPartner = new Set<string>();
    for (const [a, set] of pairs) {
        if (set.size) hasPartner.add(a);
        for (const t of set) hasPartner.add(ids[parseInt(t, 36)]!);
    }

    const token = (id: string) => tokenOf.get(id) ?? id;
    return {
        types: catalog.types,
        ids,
        options: kept.map((o) => ({
            _id: tokenOf.get(o._id)!,
            typeId: o.typeId,
            compatibleCustomizations:
                !hasPartner.has(o._id) && paired.has(o._id)
                    ? [PRUNED_PAIRS_MARKER]
                    : [...pairs.get(o._id)!],
        })),
        product: {
            available: available.map(token),
            exceptions: exceptions.map((e) => ({...e, optionId: token(e.optionId)})),
        },
    };
}
