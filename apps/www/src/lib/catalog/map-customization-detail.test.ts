import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {CatalogCustomizationDetailDoc} from '@pakfactory/sanity/queries';
import {mapSanityCustomizationDetail} from './map-sanity';

function detailDoc(
    overrides: Partial<CatalogCustomizationDetailDoc> = {},
): CatalogCustomizationDetailDoc {
    return {
        _id: 'opt-1',
        title: 'Hot Foil Stamping',
        slug: 'hot-foil-stamping',
        status: 'active',
        category: {
            _id: 'cat-1',
            title: 'Finishing',
            slug: 'finishing',
        },
        ...overrides,
    };
}

const foilDescriptionBlocks = [
    {
        _type: 'block',
        _key: 'a',
        style: 'normal',
        markDefs: [],
        children: [
            {
                _type: 'span',
                _key: 'a0',
                text: 'Hot foil stamping applies metallic foil.',
                marks: [],
            },
        ],
    },
];

describe('mapSanityCustomizationDetail option description hero (PROD-3207)', () => {
    it('maps option Description PT as descriptionBlocks and glossaryPlain as SEO description', () => {
        const glossaryDefinition = [
            {
                _type: 'block',
                _key: 'g',
                style: 'normal',
                markDefs: [],
                children: [
                    {
                        _type: 'span',
                        _key: 'g0',
                        text: 'Glossary concept copy — not the hero.',
                        marks: [],
                    },
                ],
            },
        ];
        const mapped = mapSanityCustomizationDetail(
            detailDoc({
                shortDescription: 'Short option blurb — must not win the hero.',
                benefitsPlain: 'Benefits plain — must not win.',
                glossaryPlain: 'SEO glossary plain.',
                glossaryDefinition,
                description: foilDescriptionBlocks,
            }),
        );
        assert.ok(mapped);
        assert.equal(mapped.description, 'SEO glossary plain.');
        assert.deepEqual(mapped.descriptionBlocks, foilDescriptionBlocks);
        assert.equal(
            mapped.shortDescription,
            'Short option blurb — must not win the hero.',
        );
        assert.deepEqual(mapped.glossaryDefinition, glossaryDefinition);
    });

    it('leaves descriptionBlocks empty when Studio Description is missing — no shortDescription fallback', () => {
        const mapped = mapSanityCustomizationDetail(
            detailDoc({
                shortDescription: 'Short option blurb.',
                benefitsPlain: 'Benefits plain.',
                glossaryPlain: null,
                glossaryDefinition: null,
                description: null,
            }),
        );
        assert.ok(mapped);
        assert.equal(mapped.description, undefined);
        assert.equal(mapped.descriptionBlocks, undefined);
        assert.equal(mapped.shortDescription, 'Short option blurb.');
    });

    it('maps body and alias fields without inventing a fallback alias list', () => {
        const body = [
            {
                _type: 'block',
                _key: 'b',
                style: 'normal',
                markDefs: [],
                children: [
                    {
                        _type: 'span',
                        _key: 'b0',
                        text: 'Long-form depth.',
                        marks: [],
                    },
                ],
            },
        ];
        const mapped = mapSanityCustomizationDetail(
            detailDoc({
                body,
                alsoKnownAs: ['Foil', '  Hot foil  ', ''],
                conceptAliases: ['Stamping'],
                inheritAliasesFromConcept: false,
            }),
        );
        assert.ok(mapped);
        assert.deepEqual(mapped.body, body);
        assert.deepEqual(mapped.alsoKnownAs, ['Foil', 'Hot foil']);
        assert.deepEqual(mapped.conceptAliases, ['Stamping']);
        assert.equal(mapped.inheritAliasesFromConcept, undefined);
    });

    it('records inheritAliasesFromConcept when ticked', () => {
        const mapped = mapSanityCustomizationDetail(
            detailDoc({inheritAliasesFromConcept: true}),
        );
        assert.ok(mapped);
        assert.equal(mapped.inheritAliasesFromConcept, true);
    });

    it('omits an empty short description so the compare blurb hides', () => {
        const mapped = mapSanityCustomizationDetail(
            detailDoc({shortDescription: '   '}),
        );
        assert.ok(mapped);
        assert.equal(mapped.shortDescription, undefined);
    });
});

describe('mapSanityCustomizationDetail shortName (PROD-3123)', () => {
    it('maps a trimmed short name without replacing glossary copy', () => {
        const mapped = mapSanityCustomizationDetail(
            detailDoc({
                title: 'Hot Foil Stamping Metallic',
                shortName: '  Foil  ',
                glossaryPlain: 'Hot foil stamping applies metallic foil.',
            }),
        );
        assert.ok(mapped);
        assert.equal(mapped.shortName, 'Foil');
        assert.equal(mapped.title, 'Hot Foil Stamping Metallic');
        assert.equal(
            mapped.description,
            'Hot foil stamping applies metallic foil.',
        );
    });

    it('omits an empty short name so tokens fall back to title', () => {
        const mapped = mapSanityCustomizationDetail(
            detailDoc({shortName: '   '}),
        );
        assert.ok(mapped);
        assert.equal(mapped.shortName, undefined);
    });
});

describe('mapSanityCustomizationDetail compatibleOptions (PROD-3124)', () => {
    it('maps card-shaped compatible options and skips incomplete rows', () => {
        const mapped = mapSanityCustomizationDetail(
            detailDoc({
                compatibleOptions: [
                    {
                        _id: 'opt-spot',
                        title: 'Spot UV Coating',
                        shortName: '  Spot UV  ',
                        slug: 'spot-uv',
                        shortDescription: 'Raised gloss on print.',
                        category: {
                            _id: 'cat-fin',
                            title: 'Finishing',
                            slug: 'finishing',
                        },
                        type: {title: 'Coatings', slug: 'coatings'},
                    },
                    {
                        _id: 'opt-skip',
                        title: 'Missing slug',
                        slug: null,
                        category: {
                            _id: 'cat-fin',
                            title: 'Finishing',
                            slug: 'finishing',
                        },
                    },
                    null,
                ],
            }),
        );
        assert.ok(mapped);
        assert.equal(mapped.compatibleOptions?.length, 1);
        assert.deepEqual(mapped.compatibleOptions?.[0], {
            id: 'opt-spot',
            title: 'Spot UV Coating',
            shortName: 'Spot UV',
            slug: 'spot-uv',
            categoryValue: 'finishing',
            categoryLabel: 'Finishing',
            typeTitle: 'Coatings',
            shortDescription: 'Raised gloss on print.',
        });
    });

    it('omits compatibleOptions when the pair list is empty so the section hides', () => {
        const mapped = mapSanityCustomizationDetail(
            detailDoc({compatibleOptions: []}),
        );
        assert.ok(mapped);
        assert.equal(mapped.compatibleOptions, undefined);
    });
});

describe('mapSanityCustomizationDetail achieves (PROD-3128)', () => {
    it('maps forward Achieves targets and skips incomplete rows', () => {
        const mapped = mapSanityCustomizationDetail(
            detailDoc({
                achieves: [
                    {
                        _id: 'opt-gloss',
                        title: 'Gloss',
                        slug: 'gloss',
                        typeTitle: 'Finish',
                        categorySlug: 'finishing',
                        appearsIn: 'configurable-with-page',
                        shortDescription: 'High-shine finish.',
                    },
                    {
                        _id: 'opt-skip',
                        title: '',
                        slug: 'empty-title',
                    },
                    null,
                ],
            }),
        );
        assert.ok(mapped);
        assert.equal(mapped.achieves?.length, 1);
        assert.deepEqual(mapped.achieves?.[0], {
            id: 'opt-gloss',
            title: 'Gloss',
            slug: 'gloss',
            typeTitle: 'Finish',
            categorySlug: 'finishing',
            description: 'High-shine finish.',
            imageUrl: null,
            hasPage: true,
        });
    });

    it('omits achieves when the list is empty', () => {
        const mapped = mapSanityCustomizationDetail(
            detailDoc({achieves: []}),
        );
        assert.ok(mapped);
        assert.equal(mapped.achieves, undefined);
    });
});
