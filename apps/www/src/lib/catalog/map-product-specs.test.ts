import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {CatalogProductDoc} from '@pakfactory/sanity/queries';

import {mapSanityProduct} from './map-sanity';

function doc(
    partial: Partial<CatalogProductDoc> &
        Pick<CatalogProductDoc, '_id' | 'title' | 'slug'>,
): CatalogProductDoc {
    return {
        kind: 'inspiration',
        status: 'active',
        productLine: {_id: 'line', title: 'Rigid Boxes', slug: 'rigid-boxes'},
        productStyle: {_id: 'style', title: 'Tuck End', slug: 'tuck-end'},
        availableCustomizations: [],
        ...partial,
    };
}

describe('mapSanityProduct manufacturing specs (PROD-3200)', () => {
    it('maps coalesced base fallback specs onto the product', () => {
        const product = mapSanityProduct(
            doc({
                _id: 'insp',
                title: 'Candle Mailer',
                slug: 'candle-mailer',
                moq: 1000,
                dimensionInput: 'cylinder',
                dimensionRange: {
                    diameterMin: 40,
                    diameterMax: 80,
                    heightMin: 100,
                    heightMax: 200,
                },
                leadTimeBusinessDaysMin: 10,
                leadTimeBusinessDaysMax: 15,
            }),
        );
        assert.ok(product);
        assert.equal(product.moq, 1000);
        assert.equal(product.dimensionInput, 'cylinder');
        assert.equal(product.dimensionRange?.diameterMin, 40);
        assert.equal(product.leadTimeBusinessDaysMin, 10);
        assert.equal(product.leadTimeBusinessDaysMax, 15);
    });

    it('omits unset manufacturing specs', () => {
        const product = mapSanityProduct(
            doc({
                _id: 'blank',
                title: 'Blank',
                slug: 'blank',
            }),
        );
        assert.ok(product);
        assert.equal(product.moq, undefined);
        assert.equal(product.dimensionInput, undefined);
        assert.equal(product.leadTimeBusinessDaysMin, undefined);
        assert.equal(product.leadTimeBusinessDaysMax, undefined);
    });
});
