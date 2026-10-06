import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    KIND,
    kindCta,
    kindLabel,
    resolveKind,
} from './kind';

describe('resolveKind', () => {
    it('maps inspiration products ahead of product-line bucket', () => {
        assert.equal(
            resolveKind({
                docType: 'product',
                productKind: 'inspiration',
                bucket: KIND.productLine,
            }),
            KIND.inspiration,
        );
    });

    it('maps standard products to productLine', () => {
        assert.equal(
            resolveKind({docType: 'product', productKind: 'standard'}),
            KIND.productLine,
        );
    });

    it('maps Sanity doc types', () => {
        assert.equal(resolveKind({docType: 'solution'}), KIND.industry);
        assert.equal(
            resolveKind({docType: 'customizationType'}),
            KIND.customization,
        );
        assert.equal(
            resolveKind({docType: 'expertiseStage'}),
            KIND.expertise,
        );
        assert.equal(resolveKind({docType: 'caseStudy'}), KIND.caseStudy);
        assert.equal(
            resolveKind({docType: 'productStyle'}),
            KIND.productStyle,
        );
        assert.equal(resolveKind({docType: 'productLine'}), KIND.productLine);
    });

    it('falls back to bucket then productLine', () => {
        assert.equal(
            resolveKind({bucket: KIND.caseStudy}),
            KIND.caseStudy,
        );
        assert.equal(resolveKind({}), KIND.productLine);
    });
});

describe('kindLabel / kindCta', () => {
    it('reads English catalog strings', () => {
        assert.equal(kindLabel(KIND.inspiration), 'Inspiration');
        assert.equal(kindCta(KIND.inspiration), 'View inspiration');
        assert.equal(kindLabel(KIND.productLine), 'Product line');
        assert.equal(kindCta(KIND.productLine), 'Explore products');
        assert.equal(kindCta(KIND.caseStudy), 'Read case study');
        assert.equal(kindCta(KIND.industry), 'Explore industry');
        assert.equal(kindCta(KIND.customization), 'Explore options');
        assert.equal(kindCta(KIND.expertise), 'See how we work');
        assert.equal(kindCta(KIND.productStyle), 'View style');
    });
});
