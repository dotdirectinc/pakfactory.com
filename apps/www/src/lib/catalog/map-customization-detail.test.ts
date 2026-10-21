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

describe('mapSanityCustomizationDetail glossary hero (PROD-2779)', () => {
    it('maps glossary Definition PT and plain text when linked', () => {
        const glossaryDefinition = [
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
        const mapped = mapSanityCustomizationDetail(
            detailDoc({
                shortDescription: 'Short option blurb — must not win.',
                benefitsPlain: 'Benefits plain — must not win.',
                glossaryPlain: 'Hot foil stamping applies metallic foil.',
                glossaryDefinition,
            }),
        );
        assert.ok(mapped);
        assert.equal(
            mapped.description,
            'Hot foil stamping applies metallic foil.',
        );
        assert.equal(mapped.shortDescription, 'Short option blurb — must not win.');
        assert.deepEqual(mapped.glossaryDefinition, glossaryDefinition);
    });

    it('leaves hero description empty when glossary is missing', () => {
        const mapped = mapSanityCustomizationDetail(
            detailDoc({
                shortDescription: 'Short option blurb.',
                benefitsPlain: 'Benefits plain.',
                glossaryPlain: null,
                glossaryDefinition: null,
            }),
        );
        assert.ok(mapped);
        assert.equal(mapped.description, undefined);
        assert.equal(mapped.shortDescription, 'Short option blurb.');
        assert.equal(mapped.glossaryDefinition, undefined);
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
