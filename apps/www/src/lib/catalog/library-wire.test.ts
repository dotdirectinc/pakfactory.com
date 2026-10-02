import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    packCustomizationLibrary,
    packProductLibrary,
    unpackCustomizationLibrary,
    unpackProductLibrary,
} from './library-wire';
import type {
    CustomizationLibraryItem,
    CustomizationLibraryResult,
    ProductLibraryItem,
    ProductLibraryResult,
} from './types';

const corrugated = {slug: 'corrugated-boxes', title: 'Corrugated Boxes'};
const rigid = {slug: 'rigid-boxes', title: 'Rigid Boxes'};

function product(
    overrides: Partial<ProductLibraryItem> & Pick<ProductLibraryItem, 'slug'>,
): ProductLibraryItem {
    return {
        _id: `product-${overrides.slug}`,
        title: overrides.slug.toUpperCase(),
        sku: 'SKU-1',
        kind: 'standard',
        // map-sanity always sets the key (null when there is no image).
        imageUrl: null,
        productLine: corrugated,
        productStyle: {slug: 'shipping', title: 'Shipping Boxes'},
        industries: [],
        attrs: {},
        ...overrides,
    };
}

const productLibrary: ProductLibraryResult = {
    items: [
        // Typical row: alt equals title, no optional extras.
        product({slug: 'a', imageUrl: null, imageAlt: 'A'}),
        // Every optional field set.
        product({
            slug: 'b',
            kind: 'inspiration',
            productLine: rigid,
            productStyle: {slug: 'magnetic', title: 'Magnetic'},
            imageUrl: 'https://cdn.sanity.io/images/x/y/b.png',
            imageAlt: 'A different alt',
            moq: 500,
            status: 'coming-soon',
            industries: [
                {slug: 'beauty', title: 'Beauty'},
                {slug: 'food', title: 'Food'},
            ],
            attrs: {closure: ['magnet'], sustainability: ['recyclable']},
            images: [{src: 'https://cdn.sanity.io/images/x/y/b2.png'}],
        }),
        // Absent alt, reuses refs from the rows above.
        product({
            slug: 'c',
            productLine: rigid,
            industries: [{slug: 'food', title: 'Food'}],
            moq: 100,
        }),
    ],
    linesBySlug: {
        'corrugated-boxes': {slug: 'corrugated-boxes', title: 'Corrugated Boxes'},
    },
    stylesByLineSlug: {
        'corrugated-boxes': [{value: 'shipping', label: 'Shipping Boxes'}],
    },
    propertyTitles: {closure: 'Closure'},
    facetCatalog: {shared: []},
};

describe('product library wire format', () => {
    it('round-trips every item and library field', () => {
        const restored = unpackProductLibrary(packProductLibrary(productLibrary));
        assert.deepEqual(restored, productLibrary);
    });

    it('survives JSON serialization (the RSC boundary)', () => {
        const packed = JSON.parse(
            JSON.stringify(packProductLibrary(productLibrary)),
        );
        assert.deepEqual(unpackProductLibrary(packed), productLibrary);
    });

    it('stores each line, style and industry once', () => {
        const packed = packProductLibrary(productLibrary);
        assert.equal(packed.lines.length, 2);
        assert.equal(packed.styles.length, 2);
        assert.equal(packed.industries.length, 2);
    });

    it('is smaller than the plain library', () => {
        const plain = JSON.stringify(productLibrary).length;
        const packed = JSON.stringify(packProductLibrary(productLibrary)).length;
        assert.ok(packed < plain, `${packed} should be < ${plain}`);
    });
});

function customization(
    slug: string,
    overrides: Partial<CustomizationLibraryItem> = {},
): CustomizationLibraryItem {
    return {
        _id: `option-${slug}`,
        title: slug,
        slug,
        categoryValue: 'materials',
        categoryLabel: 'Materials',
        imageUrl: null,
        productLines: [corrugated],
        attrs: {finish: ['matte']},
        propertyTitles: {finish: 'Finish'},
        valueTitles: {matte: 'Matte'},
        ...overrides,
    };
}

const customizationLibrary: CustomizationLibraryResult = {
    items: [
        customization('kraft'),
        customization('foil', {
            productLines: [corrugated, rigid],
            attrs: {coverage: ['full']},
            propertyTitles: {coverage: 'Coverage'},
            valueTitles: {full: 'Full'},
            status: 'discontinued',
        }),
    ],
    tabs: [{label: 'Materials', value: 'materials'}],
    facetCatalog: {shared: [], byCategory: {}},
};

describe('customization library wire format', () => {
    it('restores items with the union of property titles', () => {
        const restored = unpackCustomizationLibrary(
            JSON.parse(
                JSON.stringify(packCustomizationLibrary(customizationLibrary)),
            ),
        );
        const union = {finish: 'Finish', coverage: 'Coverage'};
        assert.deepEqual(restored.tabs, customizationLibrary.tabs);
        assert.deepEqual(restored.facetCatalog, customizationLibrary.facetCatalog);
        assert.deepEqual(
            restored.items,
            customizationLibrary.items.map((item) => ({
                ...item,
                propertyTitles: union,
                valueTitles: {},
            })),
        );
    });

    it('keeps every title a filter can look up', () => {
        const restored = unpackCustomizationLibrary(
            packCustomizationLibrary(customizationLibrary),
        );
        for (const [index, original] of customizationLibrary.items.entries()) {
            for (const [slug, title] of Object.entries(original.propertyTitles)) {
                assert.equal(restored.items[index]!.propertyTitles[slug], title);
            }
        }
    });
});
