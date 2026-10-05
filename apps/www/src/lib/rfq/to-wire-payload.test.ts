import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {createEmptyBuilderState, seedFromCustomizations, toggleSelection, toRequestCustomizations} from '../customization-builder/state';
import type {CustomizationBuilderState} from '../customization-builder/types';
import type {RequestDraft, RequestLine} from '../request/request.storage';
import {toWireDimensions, toWireSubmission} from './to-wire-payload';

// PROD-2605: the buyer's size, and the Type / Property choices / note on each pick, stayed in the
// browser — the builder kept them, nothing sent them. Sales saw a flat list of labels and no size.

const option = (id: string, label: string, category: string, typeId: string, typeTitle: string) => ({
    id, label, category, typeId, typeTitle, slug: id,
});
const available = [
    option('o.cmyk', 'CMYK Full Color', 'printing', 't.color', 'Color System'),
    option('o.soy', 'Soy-Based Ink', 'printing', 't.ink', 'Ink'),
    option('o.soft', 'Soft Touch', 'finishing', 't.sf', 'Surface Finish'),
];

function builder(): CustomizationBuilderState {
    let state = createEmptyBuilderState();
    state = toggleSelection(state, 'printing', {typeId: 't.color', optionId: 'o.cmyk', label: 'CMYK Full Color'}, 'one');
    state = toggleSelection(state, 'printing', {typeId: 't.ink', optionId: 'o.soy', label: 'Soy-Based Ink'}, 'many');
    state = toggleSelection(state, 'finishing', {typeId: 't.sf', optionId: 'o.soft', label: 'Soft Touch'}, 'one');
    return {
        ...state,
        answers: {
            ...state.answers,
            dimensions: {status: 'set', dimensions: {unit: 'in', external: {length: '10', width: '5', height: '3'}, internal: {length: '', width: '', height: ''}}},
        },
        entryNotes: {'o.soft': 'lid only', 'dimensions:external': 'outside is fixed'},
        propertySelectionSummaries: {
            'o.soft': [
                {kind: 'chip', label: 'Matte', omitFromSummary: false},
                {kind: 'chip', label: 'Need consultation', omitFromSummary: true},
            ],
        },
    };
}

function line(overrides: Partial<RequestLine> = {}): RequestLine {
    const state = builder();
    return {
        id: 'l1',
        productSlug: 'counter-display-boxes',
        productTitle: 'Counter Display Boxes',
        productMoq: 500,
        availableCustomizations: available as never,
        dimensionInput: 'rectangular',
        quantities: [500],
        contents: 'Candles',
        customizations: toRequestCustomizations(state, 'Specialist to advise'),
        customizationBuilder: state,
        addedAt: '2026-09-28T12:00:00.000Z',
        ...overrides,
    };
}

const draft = {
    id: 'd1', title: 'Test', entryKind: 'products', notes: 'n', timeline: '', packagingContents: '', expressQuantities: [],
    annualSpend: '', services: [], referenceImages: [], shippingAddress: null, companyAddress: null,
    contactFirstName: 'Test', contactLastName: 'Submission', contactEmail: 't@example.com', contactPhone: '', contactCompany: '', contactIndustry: '',
} as unknown as RequestDraft;

describe('toWireSubmission — what sales receives per line', () => {
    const wire = toWireSubmission(draft, [line()], 'sub-1').lines[0]!;

    it('sends every pick in a multi-pick category, each with its Type', () => {
        assert.deepEqual(
            wire.customizations.map((c) => [c.label, c.category, c.type]),
            [
                ['CMYK Full Color', 'printing', 'Color System'],
                ['Soy-Based Ink', 'printing', 'Ink'],
                ['Soft Touch', 'finishing', 'Surface Finish'],
            ],
        );
    });

    it('sends the buyer\'s Property choices and note on a pick, and never the consultation placeholder', () => {
        const soft = wire.customizations.find((c) => c.id === 'o.soft')!;
        assert.deepEqual(soft.properties, ['Matte']);
        assert.equal(soft.note, 'lid only');
    });

    it('sends the dimensions, labelled as the buyer saw them, with the side\'s note', () => {
        assert.deepEqual(wire.dimensions, {
            unit: 'in',
            external: [{axis: 'Length', value: '10'}, {axis: 'Width', value: '5'}, {axis: 'Height', value: '3'}],
            externalNote: 'outside is fixed',
        });
    });

    it('sends the product\'s MOQ, which the contract always had room for', () => {
        assert.equal(wire.moq, 500);
    });

    it('a line from before the builder still sends its picks as they were', () => {
        const old = toWireSubmission(draft, [line({customizationBuilder: undefined, availableCustomizations: undefined})], 's').lines[0]!;
        assert.deepEqual(old.customizations[0], {id: 'o.cmyk', label: 'CMYK Full Color', category: 'printing'});
        assert.equal(old.dimensions, undefined);
    });
});

describe('toWireDimensions', () => {
    it('uses the product\'s own axes — a cylinder is diameter × height', () => {
        const l = line({
            dimensionInput: 'cylinder',
            customizationBuilder: {
                ...createEmptyBuilderState(),
                answers: {dimensions: {status: 'set', dimensions: {unit: 'mm', external: {diameter: '80', height: '120'}, internal: {}}}},
            },
        });
        assert.deepEqual(toWireDimensions(l), {unit: 'mm', external: [{axis: 'Diameter', value: '80'}, {axis: 'Height', value: '120'}]});
    });

    it('a buyer who asked a specialist sends consultation', () => {
        const l = line({customizationBuilder: {...createEmptyBuilderState(), answers: {dimensions: {status: 'not-sure'}}}});
        assert.deepEqual(toWireDimensions(l), {unit: 'in', consultation: true});
    });

    it('nothing typed sends nothing', () => {
        const l = line({
            customizationBuilder: {
                ...createEmptyBuilderState(),
                answers: {dimensions: {status: 'set', dimensions: {unit: 'in', external: {length: '', width: '', height: ''}, internal: {}}}},
            },
        });
        assert.equal(toWireDimensions(l), undefined);
    });
});

describe('an older request line keeps every pick when it is edited (G4)', () => {
    it('seeding from picks with no Type keeps them all, not the first per category', () => {
        const seeded = seedFromCustomizations([
            {id: 'o.cmyk', label: 'CMYK Full Color', category: 'printing'},
            {id: 'o.soy', label: 'Soy-Based Ink', category: 'printing'},
        ] as never);
        assert.deepEqual(toRequestCustomizations(seeded, 'x').map((c) => c.id), ['o.cmyk', 'o.soy']);
    });
});

describe('toWireSubmission — services', () => {
    it('sends stage slugs and aligned titles when provided', () => {
        const withServices = {
            ...draft,
            services: ['packaging-design', 'fulfillment'],
            servicesEnabled: true,
        } as RequestDraft;
        const wire = toWireSubmission(withServices, [], 'sub-svc', {
            serviceTitles: ['Packaging Design', 'Fulfillment'],
        });
        assert.deepEqual(wire.services, ['packaging-design', 'fulfillment']);
        assert.deepEqual(wire.serviceTitles, [
            'Packaging Design',
            'Fulfillment',
        ]);
    });

    it('omits serviceTitles when the list length does not match', () => {
        const withServices = {
            ...draft,
            services: ['packaging-design'],
            servicesEnabled: true,
        } as RequestDraft;
        const wire = toWireSubmission(withServices, [], 'sub-svc-mismatch', {
            serviceTitles: ['Packaging Design', 'Extra'],
        });
        assert.deepEqual(wire.services, ['packaging-design']);
        assert.equal(wire.serviceTitles, undefined);
    });
});
