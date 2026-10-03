import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {pickRelatedProducts} from './related-products';
import type {Product} from './types';

function product(
    partial: Partial<Product> &
        Pick<Product, 'title' | 'slug' | 'kind' | 'productStyle'>,
): Product {
    return {
        sku: '-',
        media: [],
        description: '',
        productLine: partial.productLine ?? {
            slug: 'folding-cartons',
            title: 'Folding Cartons',
        },
        availableCustomizations: [],
        ...partial,
    };
}

describe('pickRelatedProducts (PROD-2780)', () => {
    const host = product({
        title: 'Custom Cosmetic STE',
        slug: 'custom-cosmetic-straight-tuck-end-box',
        kind: 'inspiration',
        productStyle: {slug: 'straight-tuck-end', title: 'Straight Tuck End'},
        breadcrumbParent: {
            slug: 'beauty-cosmetics',
            title: 'Beauty & Cosmetics',
        },
    });

    const candidates = [
        product({
            title: 'Cosmetic STE peer',
            slug: 'cosmetic-ste-peer',
            kind: 'inspiration',
            productStyle: {
                slug: 'straight-tuck-end',
                title: 'Straight Tuck End',
            },
            breadcrumbParent: {
                slug: 'beauty-cosmetics',
                title: 'Beauty & Cosmetics',
            },
        }),
        product({
            title: 'Cosmetic gable',
            slug: 'custom-cosmetic-gable-box',
            kind: 'inspiration',
            productStyle: {slug: 'gable', title: 'Gable'},
            breadcrumbParent: {
                slug: 'beauty-cosmetics',
                title: 'Beauty & Cosmetics',
            },
        }),
        product({
            title: 'Bakery cake',
            slug: 'custom-bakery-cake-box',
            kind: 'inspiration',
            productStyle: {
                slug: 'straight-tuck-end',
                title: 'Straight Tuck End',
            },
            breadcrumbParent: {slug: 'bakery-cake', title: 'Bakery & Cake'},
        }),
        product({
            title: 'Standard STE',
            slug: 'standard-ste',
            kind: 'standard',
            productStyle: {
                slug: 'straight-tuck-end',
                title: 'Straight Tuck End',
            },
        }),
        product({
            title: 'Host itself',
            slug: 'custom-cosmetic-straight-tuck-end-box',
            kind: 'inspiration',
            productStyle: {
                slug: 'straight-tuck-end',
                title: 'Straight Tuck End',
            },
            breadcrumbParent: {
                slug: 'beauty-cosmetics',
                title: 'Beauty & Cosmetics',
            },
        }),
    ];

    it('puts same-style same-industry first, then other same-industry styles', () => {
        const related = pickRelatedProducts(host, candidates);
        assert.deepEqual(
            related.map((item) => item.slug),
            ['cosmetic-ste-peer', 'custom-cosmetic-gable-box'],
        );
    });

    it('excludes other industries and other kinds', () => {
        const related = pickRelatedProducts(host, candidates);
        assert.ok(!related.some((item) => item.slug === 'custom-bakery-cake-box'));
        assert.ok(!related.some((item) => item.slug === 'standard-ste'));
        assert.ok(
            !related.some(
                (item) => item.slug === 'custom-cosmetic-straight-tuck-end-box',
            ),
        );
    });

    it('for standards without industry, fills same style then same line', () => {
        const standardHost = product({
            title: 'Host standard',
            slug: 'host-standard',
            kind: 'standard',
            productStyle: {slug: 'drawer', title: 'Drawer'},
            productLine: {slug: 'rigid-boxes', title: 'Rigid Boxes'},
        });
        const related = pickRelatedProducts(standardHost, [
            product({
                title: 'Same style other line',
                slug: 'same-style',
                kind: 'standard',
                productStyle: {slug: 'drawer', title: 'Drawer'},
                productLine: {slug: 'folding-cartons', title: 'Folding Cartons'},
            }),
            product({
                title: 'Same line other style',
                slug: 'same-line',
                kind: 'standard',
                productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
                productLine: {slug: 'rigid-boxes', title: 'Rigid Boxes'},
            }),
            product({
                title: 'Other line other style',
                slug: 'other',
                kind: 'standard',
                productStyle: {slug: 'hinged-lid', title: 'Hinged Lid'},
                productLine: {slug: 'folding-cartons', title: 'Folding Cartons'},
            }),
        ]);
        assert.deepEqual(
            related.map((item) => item.slug),
            ['same-style', 'same-line'],
        );
    });
});
