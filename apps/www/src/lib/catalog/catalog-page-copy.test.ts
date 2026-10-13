import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    CUSTOMIZATION_CATALOG_COPY_FALLBACKS,
    PRODUCT_CATALOG_COPY_FALLBACKS,
    resolveCatalogPageCopy,
} from './catalog-page-copy';

describe('resolveCatalogPageCopy', () => {
    it('uses customization fallbacks when the document is missing', () => {
        assert.deepEqual(
            resolveCatalogPageCopy(null, CUSTOMIZATION_CATALOG_COPY_FALLBACKS),
            CUSTOMIZATION_CATALOG_COPY_FALLBACKS,
        );
    });

    it('uses product fallbacks when every field is blank', () => {
        assert.deepEqual(
            resolveCatalogPageCopy(
                {
                    h1: '  ',
                    intro: null,
                    metaTitle: undefined,
                },
                PRODUCT_CATALOG_COPY_FALLBACKS,
            ),
            PRODUCT_CATALOG_COPY_FALLBACKS,
        );
    });

    it('prefers trimmed Sanity values over fallbacks', () => {
        const resolved = resolveCatalogPageCopy(
            {
                h1: '  Custom Library  ',
                searchPlaceholder: 'Find options',
                productLineFacetLabel: 'Compatible Products',
            },
            CUSTOMIZATION_CATALOG_COPY_FALLBACKS,
        );
        assert.equal(resolved.h1, 'Custom Library');
        assert.equal(resolved.searchPlaceholder, 'Find options');
        assert.equal(resolved.productLineFacetLabel, 'Compatible Products');
        assert.equal(
            resolved.intro,
            CUSTOMIZATION_CATALOG_COPY_FALLBACKS.intro,
        );
    });
});
