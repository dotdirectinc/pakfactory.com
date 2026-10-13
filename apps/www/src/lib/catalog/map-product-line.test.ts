import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {CatalogProductLineDoc} from '@pakfactory/sanity/queries';

import {mapSanityProductLine} from './map-sanity';

describe('mapSanityProductLine description (PROD-2812)', () => {
    it('keeps the long description separate from shortDescription', () => {
        const line = mapSanityProductLine({
            _id: 'line',
            title: 'Rigid Boxes',
            slug: 'rigid-boxes',
            shortDescription:
                'Premium packaging with sturdy structure for luxury presentation and lasting impact.',
            description:
                'Make a lasting impression with rigid box packaging that blends strength and sophistication.',
            styles: [],
            products: [],
        } as unknown as CatalogProductLineDoc);

        assert.equal(
            line?.description,
            'Make a lasting impression with rigid box packaging that blends strength and sophistication.',
        );
        assert.equal(
            line?.shortDescription,
            'Premium packaging with sturdy structure for luxury presentation and lasting impact.',
        );
    });

    it('does not copy shortDescription into description when the long field is empty', () => {
        const line = mapSanityProductLine({
            _id: 'line',
            title: 'Rigid Boxes',
            slug: 'rigid-boxes',
            shortDescription: 'Short only.',
            styles: [],
            products: [],
        } as unknown as CatalogProductLineDoc);

        assert.equal(line?.description, '');
        assert.equal(line?.shortDescription, 'Short only.');
    });
});
