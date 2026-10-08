import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {compatibilityProductHref} from './compatibility-product-href';

describe('compatibilityProductHref', () => {
    it('includes the serialized compatibility query on the PDP path', () => {
        assert.equal(
            compatibilityProductHref('custom-angled-cuff-ring-boxes', {
                category: 'materials',
                slug: 'kraft-chipboard',
            }),
            '/products/custom-angled-cuff-ring-boxes?materials=kraft-chipboard',
        );
    });

    it('omits the query when category or slug is empty', () => {
        assert.equal(
            compatibilityProductHref('custom-angled-cuff-ring-boxes', {
                category: '',
                slug: 'kraft-chipboard',
            }),
            '/products/custom-angled-cuff-ring-boxes',
        );
    });
});
