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
        assert.equal(mapped.glossaryDefinition, undefined);
    });
});
