import assert from 'node:assert/strict';
import {test} from 'node:test';

import type {Product} from '@/lib/catalog/types';
import {productsToHeroTiles} from './landing-content';

function productFixture(overrides: Partial<Product> & Pick<Product, 'slug' | 'title'>): Product {
    return {
        sku: 'SKU',
        kind: 'inspiration',
        description: '',
        productLine: {slug: 'line', title: 'Line'},
        productStyle: {slug: 'style', title: 'Style'},
        media: [],
        availableCustomizations: [],
        ...overrides,
    };
}

test('productsToHeroTiles prefers first lifestyle still over product still', () => {
    const tiles = productsToHeroTiles([
        productFixture({
            slug: 'kylos',
            title: 'Kylos',
            media: [
                {
                    src: 'https://cdn.example/product.jpg',
                    alt: 'Product',
                    kind: 'product',
                },
                {
                    src: 'https://cdn.example/life.jpg',
                    alt: 'Lifestyle',
                    kind: 'lifestyle',
                },
            ],
        }),
    ]);
    assert.equal(tiles[0]?.image?.src, 'https://cdn.example/life.jpg');
    assert.equal(tiles[0]?.image?.alt, 'Lifestyle');
});

test('productsToHeroTiles falls back to primary product still without lifestyle', () => {
    const tiles = productsToHeroTiles([
        productFixture({
            slug: 'box',
            title: 'Box',
            media: [
                {
                    src: 'https://cdn.example/primary.jpg',
                    alt: 'Primary',
                    kind: 'product',
                },
                {
                    src: 'https://cdn.example/side.jpg',
                    alt: 'Side',
                    kind: 'product',
                },
            ],
        }),
    ]);
    assert.equal(tiles[0]?.image?.src, 'https://cdn.example/primary.jpg');
});
