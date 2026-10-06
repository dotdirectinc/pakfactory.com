import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {buildProductLibraryResult} from './build-product-library';
import {
    matchesProductItem,
    productItemHasFacetValue,
} from './product-catalog-filter';
import type {ProductLibraryItem} from './types';
import {PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID} from './types';

const book = {slug: 'book-style-rigid-boxes', title: 'Book Style Rigid Boxes'};
const magnetic = {
    slug: 'magnetic-closure-rigid-boxes',
    title: 'Magnetic Closure Rigid Boxes',
};
const line = {slug: 'rigid-boxes', title: 'Rigid Boxes'};

function item(
    overrides: Partial<ProductLibraryItem> & Pick<ProductLibraryItem, 'slug'>,
): ProductLibraryItem {
    const productStyle = overrides.productStyle ?? book;
    const {productStyles: membership, ...rest} = overrides;
    return {
        _id: `p-${overrides.slug}`,
        title: overrides.slug,
        sku: 'SKU',
        kind: 'standard',
        productLine: line,
        industries: [],
        attrs: {},
        ...rest,
        productStyle,
        productStyles: membership ?? [productStyle],
    };
}

/** Smoke product from PROD-2843 — primary Book Style, secondary Magnetic Closure. */
const magneticBook = item({
    slug: 'custom-magnetic-closure-book-style-rigid-boxes',
    productStyle: book,
    productStyles: [book, magnetic],
});

describe('product catalog style membership (PROD-2843)', () => {
    it('matches a secondary style in the nested style facet', () => {
        assert.equal(
            matchesProductItem(magneticBook, {
                query: '',
                selections: {
                    [PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID]: [
                        magnetic.slug,
                    ],
                },
            }),
            true,
        );
    });

    it('keeps primary style as the displayed productStyle', () => {
        assert.equal(magneticBook.productStyle.slug, book.slug);
    });

    it('counts the product under both style facet options', () => {
        const library = buildProductLibraryResult(
            [magneticBook],
            [{slug: line.slug, title: line.title}],
        );
        assert.equal(
            productItemHasFacetValue(
                magneticBook,
                PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID,
                book.slug,
            ),
            true,
        );
        assert.equal(
            productItemHasFacetValue(
                magneticBook,
                PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID,
                magnetic.slug,
            ),
            true,
        );
        const styleOptions = library.stylesByLineSlug[line.slug] ?? [];
        assert.deepEqual(
            styleOptions.map((opt) => opt.value).sort(),
            [book.slug, magnetic.slug].sort(),
        );
    });

    it('does not match an unrelated style', () => {
        assert.equal(
            matchesProductItem(magneticBook, {
                query: '',
                selections: {
                    [PRODUCT_CATALOG_PRODUCT_STYLE_FACET_ID]: [
                        'hinged-lid-rigid-boxes',
                    ],
                },
            }),
            false,
        );
    });
});
