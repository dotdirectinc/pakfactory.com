import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    buildWorksWithProducts,
    toWorksWithSource,
} from '@/lib/catalog/build-works-with-products';
import type {ProductOfferIndex} from '@/lib/catalog/product-offer-index';
import type {
    ProductLibraryItem,
    ProductLibraryResult,
} from '@/lib/catalog/types';

function item(
    id: string,
    slug: string,
    lineSlug: string,
    lineTitle: string,
    kind: ProductLibraryItem['kind'] = 'standard',
): ProductLibraryItem {
    return {
        _id: id,
        title: slug,
        slug,
        sku: slug.toUpperCase(),
        kind,
        productLine: {slug: lineSlug, title: lineTitle},
        productStyle: {slug: 'style', title: 'Style'},
        productStyles: [{slug: 'style', title: 'Style'}],
        industries: [],
        attrs: {},
    };
}

describe('buildWorksWithProducts', () => {
    it('keeps products whose base offer includes the option', () => {
        const library: ProductLibraryResult = {
            items: [
                item('p1', 'box-a', 'rigid-boxes', 'Rigid Boxes'),
                item('p2', 'box-b', 'mailers', 'Mailers'),
                item('p3', 'box-c', 'rigid-boxes', 'Rigid Boxes'),
            ],
            linesBySlug: {},
            stylesByLineSlug: {},
            facetCatalog: {shared: []},
            propertyTitles: {},
        };
        const offerIndex: ProductOfferIndex = {
            entries: [
                {
                    productId: 'p1',
                    slug: 'box-a',
                    kind: 'standard',
                    baseOfferIds: new Set(['opt.foil']),
                    rulesProduct: null,
                },
                {
                    productId: 'p2',
                    slug: 'box-b',
                    kind: 'standard',
                    baseOfferIds: new Set(['opt.other']),
                    rulesProduct: null,
                },
                {
                    productId: 'p3',
                    slug: 'box-c',
                    kind: 'standard',
                    baseOfferIds: new Set(['opt.foil', 'opt.other']),
                    rulesProduct: null,
                },
            ],
            hasRules: false,
            rules: null,
        };

        const result = buildWorksWithProducts({
            optionId: 'opt.foil',
            products: library.items,
            offerIndex,
            preferredLines: [
                {slug: 'rigid-boxes', title: 'Rigid Boxes'},
                {slug: 'mailers', title: 'Mailers'},
            ],
        });

        assert.deepEqual(
            result.products.map((p) => p.slug).sort(),
            ['box-a', 'box-c'],
        );
        assert.deepEqual(
            result.lines.map((l) => l.slug),
            ['rigid-boxes'],
        );
    });

    it('excludes inspiration products even when the offer includes the option', () => {
        const library: ProductLibraryResult = {
            items: [
                item('p1', 'box-a', 'rigid-boxes', 'Rigid Boxes'),
                item(
                    'p-insp',
                    'insp-box',
                    'rigid-boxes',
                    'Rigid Boxes',
                    'inspiration',
                ),
            ],
            linesBySlug: {},
            stylesByLineSlug: {},
            facetCatalog: {shared: []},
            propertyTitles: {},
        };
        const offerIndex: ProductOfferIndex = {
            entries: [
                {
                    productId: 'p1',
                    slug: 'box-a',
                    kind: 'standard',
                    baseOfferIds: new Set(['opt.foil']),
                    rulesProduct: null,
                },
                {
                    productId: 'p-insp',
                    slug: 'insp-box',
                    kind: 'inspiration',
                    baseOfferIds: new Set(['opt.foil']),
                    rulesProduct: null,
                },
            ],
            hasRules: false,
            rules: null,
        };

        const result = buildWorksWithProducts({
            optionId: 'opt.foil',
            products: library.items,
            offerIndex,
        });

        assert.deepEqual(
            result.products.map((p) => p.slug),
            ['box-a'],
        );
    });

    it('the slim cached list gives exactly what the full library gives (PROD-3121)', () => {
        const full = [
            {...item('p1', 'box-a', 'rigid-boxes', 'Rigid Boxes'), imageUrl: 'https://cdn/a.png', imageAlt: 'A box', attrs: {finish: ['matte']}},
            item('p2', 'box-b', 'mailers', 'Mailers'),
            item('p3', 'box-c', 'rigid-boxes', 'Rigid Boxes'),
            item('p4', 'insp', 'mailers', 'Mailers', 'inspiration'),
        ];
        const offerIndex: ProductOfferIndex = {
            entries: full.map((p) => ({
                productId: p._id,
                slug: p.slug,
                kind: p.kind,
                baseOfferIds: new Set(p._id === 'p2' ? ['opt.other'] : ['opt.foil']),
                rulesProduct: null,
            })),
            hasRules: false,
            rules: null,
        };
        const slim = full.filter((p) => p.kind === 'standard').map(toWorksWithSource);
        for (const preferredLines of [undefined, [{slug: 'mailers', title: 'Mailers'}]]) {
            assert.deepEqual(
                buildWorksWithProducts({optionId: 'opt.foil', products: slim, offerIndex, preferredLines}),
                buildWorksWithProducts({optionId: 'opt.foil', products: full, offerIndex, preferredLines}),
            );
        }
    });
});
