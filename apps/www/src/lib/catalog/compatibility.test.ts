import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    buildDependencyGraph,
    type CatalogWithDependencies,
} from '@pakfactory/sanity/customization-rules/dependencies';

import {
    matchCompatibility,
    type CompatibilityProductInput,
    type CompatibilitySelectedOption,
} from './compatibility';

const catalog = (): CatalogWithDependencies => ({
    types: [
        {
            _id: 't.material',
            title: 'Board',
            availabilityDecidedBy: 'product',
            customerSelects: 'one',
        },
        {
            _id: 't.finish',
            title: 'Finish',
            availabilityDecidedBy: 'customization',
            customerSelects: 'one',
            requirements: [['t.material']],
        },
        {
            _id: 't.extra',
            title: 'Extra',
            availabilityDecidedBy: 'product',
            customerSelects: 'many',
        },
    ],
    options: [
        {
            _id: 'o.sbs',
            title: 'SBS',
            typeId: 't.material',
            compatibleCustomizations: ['o.matte', 'o.strip'],
        },
        {
            _id: 'o.kraft',
            title: 'Kraft',
            typeId: 't.material',
            compatibleCustomizations: ['o.matte'],
        },
        {
            _id: 'o.matte',
            title: 'Matte',
            typeId: 't.finish',
            compatibleCustomizations: ['o.sbs', 'o.kraft'],
        },
        {
            _id: 'o.gloss',
            title: 'Gloss',
            typeId: 't.finish',
            compatibleCustomizations: ['o.sbs'],
        },
        {
            _id: 'o.strip',
            title: 'Adhesive Strip',
            typeId: 't.extra',
            compatibleCustomizations: ['o.sbs'],
        },
        {
            _id: 'o.window',
            title: 'Window Patch',
            typeId: 't.extra',
            compatibleCustomizations: ['o.sbs'],
        },
    ],
});

const sel = (
    optionId: string,
    typeId: string,
    category = 'materials',
    optionSlug = optionId,
): CompatibilitySelectedOption => ({
    optionId,
    typeId,
    category,
    optionSlug,
    title: optionId,
});

const product = (
    id: string,
    offer: string[],
): CompatibilityProductInput => ({
    productId: id,
    baseOfferIds: new Set(offer),
    rulesProduct: {
        _id: id,
        availableCustomizations: offer.map((optionId) => ({optionId})),
    },
});

describe('matchCompatibility', () => {
    it('returns full matches when every option is in the base set and the combination survives', () => {
        const rules = {
            catalog: catalog(),
            graph: buildDependencyGraph(catalog()),
        };
        const result = matchCompatibility(
            [
                product('p.full', ['o.sbs', 'o.matte', 'o.strip']),
                product('p.partial', ['o.sbs', 'o.matte']),
            ],
            [
                sel('o.sbs', 't.material'),
                sel('o.strip', 't.extra', 'additional-customization', 'strip'),
            ],
            {rules},
        );
        assert.deepEqual(
            result.full.map((row) => row.productId),
            ['p.full'],
        );
        assert.equal(result.partial.length, 1);
        assert.equal(result.partial[0]?.productId, 'p.partial');
        assert.equal(result.partial[0]?.reason.kind, 'missing');
    });

    it('moves a base-set full match to partial when resolveWithSelections invalidates', () => {
        // Kraft + strip: strip is only paired with SBS, so the combination fails.
        const rules = {
            catalog: catalog(),
            graph: buildDependencyGraph(catalog()),
        };
        const result = matchCompatibility(
            [product('p.kraft', ['o.kraft', 'o.strip', 'o.matte'])],
            [
                sel('o.kraft', 't.material'),
                sel('o.strip', 't.extra', 'additional-customization', 'strip'),
            ],
            {rules},
        );
        assert.equal(result.full.length, 0);
        assert.equal(result.partial.length, 1);
        assert.equal(result.partial[0]?.reason.kind, 'conflict');
    });

    it('omits the partial group when only one option is selected', () => {
        const result = matchCompatibility(
            [
                product('p.yes', ['o.sbs', 'o.matte']),
                product('p.no', ['o.kraft']),
            ],
            [sel('o.sbs', 't.material')],
            {rules: null},
        );
        assert.deepEqual(
            result.full.map((row) => row.productId),
            ['p.yes'],
        );
        assert.equal(result.partial.length, 0);
    });

    it('sorts partials by matched.length descending', () => {
        const result = matchCompatibility(
            [
                product('p.one', ['o.sbs']),
                product('p.two', ['o.sbs', 'o.matte']),
                product('p.none', ['o.kraft']),
            ],
            [
                sel('o.sbs', 't.material'),
                sel('o.matte', 't.finish', 'finishing', 'matte'),
                sel('o.strip', 't.extra', 'additional-customization', 'strip'),
            ],
            {rules: null},
        );
        assert.equal(result.full.length, 0);
        assert.deepEqual(
            result.partial.map((row) => row.productId),
            ['p.two', 'p.one'],
        );
    });

    it('returns unknownSelections without affecting matches', () => {
        const unknown = [
            sel('o.gone', 't.material', 'materials', 'retired-board'),
        ];
        const result = matchCompatibility(
            [product('p.yes', ['o.sbs'])],
            [sel('o.sbs', 't.material')],
            {rules: null, unknownSelections: unknown},
        );
        assert.equal(result.full.length, 1);
        assert.deepEqual(result.unknownSelections, unknown);
    });

    it('treats full base matches as full when rules are absent', () => {
        const result = matchCompatibility(
            [product('p.any', ['o.kraft', 'o.strip'])],
            [
                sel('o.kraft', 't.material'),
                sel('o.strip', 't.extra', 'additional-customization', 'strip'),
            ],
            {rules: null},
        );
        assert.deepEqual(
            result.full.map((row) => row.productId),
            ['p.any'],
        );
        assert.equal(result.partial.length, 0);
    });
});
