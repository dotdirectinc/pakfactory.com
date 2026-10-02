import assert from 'node:assert/strict';
import {test} from 'node:test';

import type {CatalogProductDoc} from '@pakfactory/sanity/queries';

import {pickBreadcrumbSolutionStyle} from './resolve-breadcrumb-style';

const product = {
    _id: 'product.cookie-box',
    title: 'Cookie Box',
    slug: 'cookie-box',
    kind: 'inspiration',
    status: 'active',
    customerFacing: true,
    productLine: {_id: 'line.box', title: 'Boxes', slug: 'boxes'},
    productStyle: {_id: 'style.tuck', title: 'Tuck', slug: 'tuck'},
    productLineId: 'line.box',
    productStyleIds: ['style.tuck'],
    solutionIds: ['sol.beauty'],
} as CatalogProductDoc;

test('pickBreadcrumbSolutionStyle returns the first merchandised match', () => {
    const picked = pickBreadcrumbSolutionStyle(product, 'sol.beauty', [
        {
            _id: 'ss.other',
            title: 'Other',
            shortName: 'Other',
            slug: 'other',
            filter: {productLines: [{_ref: 'line.other'}]},
        },
        {
            _id: 'ss.pouches',
            title: 'Beauty Pouches',
            shortName: 'Pouches',
            slug: 'beauty-pouches',
            filter: {productLines: [{_ref: 'line.box'}]},
        },
    ]);
    assert.deepEqual(picked, {title: 'Pouches', slug: 'beauty-pouches'});
});

test('pickBreadcrumbSolutionStyle returns null when nothing matches', () => {
    assert.equal(
        pickBreadcrumbSolutionStyle(product, 'sol.beauty', [
            {
                _id: 'ss.other',
                title: 'Other',
                slug: 'other',
                filter: {productLines: [{_ref: 'line.other'}]},
            },
        ]),
        null,
    );
});
