import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {CatalogLibraryOptionDoc} from '@pakfactory/sanity/queries';

import {mapSanityLibraryOption} from './map-sanity';

function option(
    overrides: Partial<CatalogLibraryOptionDoc> = {},
): CatalogLibraryOptionDoc {
    return {
        _id: 'opt-1',
        title: 'Aqueous Coating (AQ)',
        slug: 'aqueous-coating',
        category: {
            _id: 'cat-1',
            title: 'Finishing',
            slug: 'finishing',
        },
        ...overrides,
    };
}

describe('mapSanityLibraryOption (PROD-3100)', () => {
    it('keeps short name and type title beside the full title and category', () => {
        const mapped = mapSanityLibraryOption(
            option({
                shortName: '  AQ Coating  ',
                type: {_id: 'type-1', title: 'Coating', slug: 'coating'},
            }),
        );
        assert.equal(mapped?.title, 'Aqueous Coating (AQ)');
        assert.equal(mapped?.shortName, 'AQ Coating');
        assert.equal(mapped?.typeTitle, 'Coating');
        assert.equal(mapped?.categoryLabel, 'Finishing');
    });

    it('omits an empty short name and a missing type', () => {
        const mapped = mapSanityLibraryOption(option({shortName: '   '}));
        assert.equal(mapped?.shortName, undefined);
        assert.equal(mapped?.typeTitle, undefined);
        assert.equal(mapped?.title, 'Aqueous Coating (AQ)');
    });
});
