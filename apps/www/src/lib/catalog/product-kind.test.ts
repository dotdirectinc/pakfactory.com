import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    isInspirationProduct,
    isProductKind,
    isStandardProduct,
    PRODUCT_KIND,
    PRODUCT_LINE_PRODUCT_KIND,
    productsOfKind,
    SOLUTION_PRODUCT_KIND,
} from '@/lib/catalog/product-kind';

describe('product-kind', () => {
    it('exposes surface defaults', () => {
        assert.equal(PRODUCT_LINE_PRODUCT_KIND, PRODUCT_KIND.standard);
        assert.equal(SOLUTION_PRODUCT_KIND, PRODUCT_KIND.inspiration);
    });

    it('predicates match kind', () => {
        assert.equal(isProductKind('standard'), true);
        assert.equal(isProductKind('inspiration'), true);
        assert.equal(isProductKind('productLine'), false);
        assert.equal(isStandardProduct({kind: 'standard'}), true);
        assert.equal(isInspirationProduct({kind: 'inspiration'}), true);
        assert.equal(isStandardProduct({kind: 'inspiration'}), false);
    });

    it('productsOfKind filters arrays', () => {
        const items = [
            {id: 'a', kind: PRODUCT_KIND.standard as const},
            {id: 'b', kind: PRODUCT_KIND.inspiration as const},
            {id: 'c', kind: PRODUCT_KIND.standard as const},
        ];
        assert.deepEqual(productsOfKind(items, PRODUCT_LINE_PRODUCT_KIND), [
            items[0],
            items[2],
        ]);
        assert.deepEqual(productsOfKind(items, SOLUTION_PRODUCT_KIND), [
            items[1],
        ]);
    });
});
