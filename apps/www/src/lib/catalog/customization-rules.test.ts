import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {buildDependencyGraph} from '@pakfactory/sanity/customization-rules/dependencies';
import {resolveWithSelections} from '@pakfactory/sanity/customization-rules/selections';
import type {CatalogCustomizationRulesDoc, CatalogRulesOptionDoc} from '@pakfactory/sanity/queries';
import {narrowByRules, selectionsFromState} from '../customization-builder/rules-narrowing';
import {createEmptyBuilderState} from '../customization-builder/state';
import type {CustomizationBuilderState} from '../customization-builder/types';
import {prepareRules, resolveProductCustomizations, PRUNED_PAIRS_MARKER} from './customization-rules';
import type {CustomizationOption} from './types';

// The Rectangular Tin case (PROD-2595 / PROD-2556), at its smallest:
//   Printing Method needs a board (Materials) AND an ink; Spot Coating needs ANY finish.
//   Offset prints on tinplate; Heat Transfer only on canvas. A tin has no paper finish.
const option = (
    _id: string,
    title: string,
    typeId: string,
    compatible: string[] = [],
    configuratorRole: 'configurable' | 'reference' = 'configurable',
): CatalogRulesOptionDoc => ({
    _id,
    title,
    slug: _id,
    status: 'active',
    configuratorRole,
    type: null,
    typeId,
    compatibleCustomizations: compatible,
});

const rulesDoc = (): CatalogCustomizationRulesDoc => ({
    types: [
        {_id: 't.tin', title: 'Tin Box Material', availabilityDecidedBy: 'product', customerSelects: 'one', categoryId: 'c.materials'},
        {_id: 't.fabric', title: 'Fabric', availabilityDecidedBy: 'product', customerSelects: 'one', categoryId: 'c.materials'},
        {_id: 't.ink', title: 'Ink', availabilityDecidedBy: 'customization', customerSelects: 'many', categoryId: 'c.printing', requirements: [['c.materials']]},
        {_id: 't.method', title: 'Printing Method', availabilityDecidedBy: 'customization', customerSelects: 'one', categoryId: 'c.printing', requirements: [['c.materials'], ['t.ink']]},
        {_id: 't.sf', title: 'Surface Finish', availabilityDecidedBy: 'customization', customerSelects: 'one', categoryId: 'c.finishing', requirements: [['c.materials']]},
        {_id: 't.sfnp', title: 'Surface Finish (non-paper)', availabilityDecidedBy: 'customization', customerSelects: 'one', categoryId: 'c.finishing', requirements: [['c.materials']]},
        {_id: 't.spot', title: 'Spot Coating', availabilityDecidedBy: 'customization', customerSelects: 'many', categoryId: 'c.finishing', requirements: [['t.sf', 't.sfnp']]},
    ],
    options: [
        option('o.tinplate', 'Tinplate', 't.tin'),
        option('o.canvas', 'Canvas', 't.fabric'),
        option('o.metallic', 'Metallic Ink', 't.ink', ['o.tinplate', 'o.canvas']),
        option('o.offset', 'Offset', 't.method', ['o.tinplate', 'o.metallic']),
        option('o.htp', 'Heat Transfer Printing', 't.method', ['o.canvas', 'o.metallic']),
        option('o.matte', 'Matte', 't.sf', ['o.canvas']),
        option('o.mattenp', 'Matte (for non-paper)', 't.sfnp', ['o.tinplate']),
        option('o.spotuv', 'Spot UV', 't.spot', ['o.matte', 'o.mattenp']),
        // A reference option: never shown to the customer, still a partner.
        option('o.lining', 'Lining', 't.sfnp', ['o.tinplate'], 'reference'),
    ],
});

const categoryOf: Record<string, string> = {
    't.tin': 'materials', 't.fabric': 'materials', 't.ink': 'printing', 't.method': 'printing',
    't.sf': 'finishing', 't.sfnp': 'finishing', 't.spot': 'finishing',
};
const map = (doc: CatalogRulesOptionDoc, preselected: boolean): CustomizationOption | null =>
    doc.configuratorRole === 'reference'
        ? null
        : {
              id: doc._id,
              label: doc.title,
              category: categoryOf[doc.typeId ?? ''] ?? 'other',
              typeId: doc.typeId ?? undefined,
              ...(preselected ? {preselected: true} : {}),
          };

const resolve = (available: string[], extra: {exceptions?: {optionId: string; mode: 'add' | 'remove'; reason?: string}[]; preselectedIds?: string[]} = {}) => {
    const rules = prepareRules(rulesDoc());
    assert.ok(rules, 'the fixture has rules');
    return resolveProductCustomizations(
        rules,
        {rulesProduct: {available, exceptions: extra.exceptions ?? []}, preselectedIds: extra.preselectedIds ?? [], productId: 'p'},
        map,
    );
};
const idsOf = (list: {id: string}[]) => list.map((o) => o.id).sort();

describe('customization rules — the product offer', () => {
    it('the tin gets Spot UV through its non-paper finish, and never Heat Transfer Printing', () => {
        const {availableCustomizations} = resolve(['o.tinplate']);
        const ids = idsOf(availableCustomizations);
        assert.ok(ids.includes('o.spotuv'), 'ANY finish is enough for Spot Coating');
        assert.ok(ids.includes('o.offset'), 'Offset has a board AND an ink');
        assert.ok(!ids.includes('o.htp'), 'Heat Transfer has an ink but no board it prints on');
    });

    it('lists the product-decided options it offers directly, and nothing derived it cannot take', () => {
        assert.deepEqual(idsOf(resolve(['o.tinplate']).availableCustomizations), [
            'o.mattenp', 'o.metallic', 'o.offset', 'o.spotuv', 'o.tinplate',
        ]);
    });

    it('keeps reference options out of what the customer sees, but in the snapshot as partners', () => {
        const {availableCustomizations, customizationRules} = resolve(['o.tinplate']);
        assert.ok(!idsOf(availableCustomizations).includes('o.lining'));
        assert.ok(customizationRules.ids.includes('o.lining'));
    });

    it('marks the preset\'s own pre-selections, while the offer comes from the list it is given', () => {
        const {availableCustomizations} = resolve(['o.tinplate'], {preselectedIds: ['o.offset']});
        assert.equal(availableCustomizations.find((o) => o.id === 'o.offset')?.preselected, true);
        assert.equal(availableCustomizations.find((o) => o.id === 'o.metallic')?.preselected, undefined);
    });

    it('applies exceptions: a remove takes an option out, an add puts one in', () => {
        const removed = resolve(['o.tinplate'], {exceptions: [{optionId: 'o.offset', mode: 'remove', reason: 'x'}]});
        assert.ok(!idsOf(removed.availableCustomizations).includes('o.offset'));
        const added = resolve(['o.tinplate'], {exceptions: [{optionId: 'o.htp', mode: 'add', reason: 'x'}]});
        assert.ok(idsOf(added.availableCustomizations).includes('o.htp'));
    });

    it('reads a drafts. id as its published document', () => {
        assert.ok(idsOf(resolve(['drafts.o.tinplate']).availableCustomizations).includes('o.offset'));
    });
});

describe('customization rules — the production guard', () => {
    it('is null when no option has compatible pairs (the rules would take everything away)', () => {
        const doc = rulesDoc();
        doc.options = doc.options!.map((o) => ({...o, compatibleCustomizations: []}));
        assert.equal(prepareRules(doc), null);
    });

    it('is null when no type has requirements', () => {
        const doc = rulesDoc();
        doc.types = doc.types!.map((t) => ({...t, requirements: []}));
        assert.equal(prepareRules(doc), null);
    });

    it('is null with no data at all', () => {
        assert.equal(prepareRules(null), null);
    });
});

// The builder answers one option per CATEGORY step, as designed.
const answer = (
    state: CustomizationBuilderState,
    key: string,
    typeId: string,
    optionId: string,
): CustomizationBuilderState => ({
    ...state,
    answers: {...state.answers, [key]: {status: 'set', selection: {typeId, optionId, label: optionId}}},
});

describe('builder narrowing', () => {
    const product = ['o.tinplate', 'o.canvas'];

    it('turns category answers into the rules\' type → option selections', () => {
        let state = answer(createEmptyBuilderState(), 'materials', 't.tin', 'o.tinplate');
        state = answer(state, 'printing', 't.method', 'o.offset');
        assert.deepEqual(selectionsFromState(state), {'t.tin': ['o.tinplate'], 't.method': ['o.offset']});
    });

    it('narrows the list to the chosen board: tinplate keeps Offset, drops Heat Transfer', () => {
        const {availableCustomizations, customizationRules} = resolve(product);
        const state = answer(createEmptyBuilderState(), 'materials', 't.tin', 'o.tinplate');
        const ids = idsOf(narrowByRules(availableCustomizations, customizationRules, state).available);
        assert.ok(ids.includes('o.offset'));
        assert.ok(!ids.includes('o.htp'));
    });

    it('the answered step still lists its own alternatives, so the customer can switch board', () => {
        const {availableCustomizations, customizationRules} = resolve(product);
        const state = answer(createEmptyBuilderState(), 'materials', 't.tin', 'o.tinplate');
        const ids = idsOf(narrowByRules(availableCustomizations, customizationRules, state).available);
        assert.ok(ids.includes('o.canvas'), 'Canvas stays listed under Materials');
    });

    it('flags an earlier answer the new board makes impossible, so the builder can clear it', () => {
        const {availableCustomizations, customizationRules} = resolve(product);
        let state = answer(createEmptyBuilderState(), 'printing', 't.method', 'o.offset');
        state = answer(state, 'materials', 't.fabric', 'o.canvas');
        const {invalidOptionIds} = narrowByRules(availableCustomizations, customizationRules, state);
        assert.deepEqual([...invalidOptionIds], ['o.offset']);
    });

    it('with no rules snapshot, lists everything and clears nothing', () => {
        const {availableCustomizations} = resolve(product);
        const state = answer(createEmptyBuilderState(), 'materials', 't.fabric', 'o.canvas');
        const narrowed = narrowByRules(availableCustomizations, undefined, state);
        assert.equal(narrowed.available.length, availableCustomizations.length);
        assert.equal(narrowed.invalidOptionIds.size, 0);
    });

    it('the pruned snapshot narrows exactly like the full catalog, for every selection', () => {
        const rules = prepareRules(rulesDoc())!;
        const {customizationRules} = resolve(product);
        const full = {types: rules.catalog.types, options: rules.catalog.options};
        const pruned = {types: customizationRules.types, options: customizationRules.options};
        // The snapshot speaks compact tokens; translate in and out so both answer in real ids.
        const token = (id: string) => customizationRules.ids.indexOf(id).toString(36);
        const real = (t: string) => customizationRules.ids[parseInt(t, 36)] ?? t;
        const standing = (catalog: typeof full, selections: Record<string, string[]>, encode: (id: string) => string, decode: (t: string) => string) => {
            const productDoc = {_id: 'p', availableCustomizations: product.map((optionId) => ({optionId: encode(optionId)}))};
            const encoded = Object.fromEntries(Object.entries(selections).map(([t, ids]) => [t, ids.map(encode)]));
            const r = resolveWithSelections(catalog, productDoc, buildDependencyGraph(catalog), encoded);
            return {
                available: [...r.availableByType.values()].flat().map(decode).sort(),
                invalidated: r.invalidated.map((i) => decode(i.optionId)).sort(),
            };
        };
        const same = (id: string) => id;
        const choices: Record<string, string[]>[] = [
            {},
            {'t.tin': ['o.tinplate']},
            {'t.fabric': ['o.canvas']},
            {'t.tin': ['o.tinplate'], 't.method': ['o.offset']},
            {'t.fabric': ['o.canvas'], 't.method': ['o.offset']},
            {'t.ink': ['o.metallic'], 't.spot': ['o.spotuv']},
            {'t.fabric': ['o.canvas'], 't.sfnp': ['o.mattenp']},
        ];
        for (const selections of choices) {
            assert.deepEqual(standing(pruned, selections, token, real), standing(full, selections, same, same), JSON.stringify(selections));
        }
    });

    it('keeps an option eligible when pruning removed all of its pairs', () => {
        // Foil pairs only with an option this product never offers.
        const doc = rulesDoc();
        doc.types!.push({_id: 't.foil', title: 'Foil', availabilityDecidedBy: 'customization', customerSelects: 'one', categoryId: 'c.finishing', requirements: []});
        doc.options!.push(option('o.foil', 'Foil', 't.foil', ['o.elsewhere']));
        doc.options!.push(option('o.elsewhere', 'Elsewhere', 't.fabric'));
        const rules = prepareRules(doc)!;
        const {customizationRules} = resolveProductCustomizations(
            rules,
            {rulesProduct: {available: ['o.tinplate'], exceptions: []}, preselectedIds: [], productId: 'p'},
            map,
        );
        const foil = customizationRules.ids.indexOf('o.foil').toString(36);
        assert.deepEqual(customizationRules.options.find((o) => o._id === foil)?.compatibleCustomizations, [PRUNED_PAIRS_MARKER]);
    });
});
