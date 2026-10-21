import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {matchesCustomizationItem} from './customization-catalog-filter';
import type {CustomizationLibraryItem} from './types';

function item(
    overrides: Partial<CustomizationLibraryItem> = {},
): CustomizationLibraryItem {
    return {
        _id: 'opt-1',
        title: 'Spot UV Varnish',
        slug: 'hot-foil',
        categoryValue: 'finishing',
        productLines: [],
        attrs: {},
        propertyTitles: {},
        valueTitles: {},
        ...overrides,
    };
}

const none = {category: 'all', selections: {}};

describe('customization catalog search (PROD-3100)', () => {
    it('matches the short name when the full title does not contain it', () => {
        const foil = item({shortName: 'Foil'});
        assert.equal(
            matchesCustomizationItem(foil, {...none, query: 'foil'}),
            true,
        );
        assert.equal(
            matchesCustomizationItem(item(), {...none, query: 'foil'}),
            false,
        );
    });

    it('still matches the full title', () => {
        assert.equal(
            matchesCustomizationItem(item({shortName: 'Foil'}), {
                ...none,
                query: 'varnish',
            }),
            true,
        );
    });
});
