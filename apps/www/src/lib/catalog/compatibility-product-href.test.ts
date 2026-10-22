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

    it('omits the query when the option is null so knowledge rails do not preselect', () => {
        assert.equal(
            compatibilityProductHref('custom-angled-cuff-ring-boxes', null),
            '/products/custom-angled-cuff-ring-boxes',
        );
    });

    it('serializes Achieves apply as finish plus achievedBy technique slug', () => {
        assert.equal(
            compatibilityProductHref('chipboard-dividers-partitions', {
                category: 'finishing',
                slug: 'gloss',
                achievedBySlug: 'aq-coating-aqueous',
            }),
            '/products/chipboard-dividers-partitions?finishing=gloss&finishing.achievedBy=aq-coating-aqueous',
        );
    });

    it('omits achievedBy when Apply is the page option (properties source)', () => {
        assert.equal(
            compatibilityProductHref('custom-angled-cuff-ring-boxes', {
                category: 'materials',
                slug: 'kraft-chipboard',
            }),
            '/products/custom-angled-cuff-ring-boxes?materials=kraft-chipboard',
        );
    });
});
