import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {
    PageSectionCatalogRowItemDoc,
    PageSectionProductLinesRowDoc,
    PageSectionSolutionsRowDoc,
} from '@pakfactory/sanity/queries';

import {mapProductLinesRow, mapSolutionsRow} from './map-catalog-rows';

const item = (
    _type: 'productLine' | 'solution',
    id: string,
    status?: string | null,
): PageSectionCatalogRowItemDoc => ({
    _id: id,
    _type,
    title: id,
    slug: id,
    ...(status !== undefined ? {status} : {}),
});

describe('mapProductLinesRow — status gates (PROD-2845)', () => {
    it('keeps active lines and drops coming-soon', () => {
        const section: PageSectionProductLinesRowDoc = {
            _type: 'productLinesRow',
            _key: 'lines',
            heading: 'Products',
            items: [
                item('productLine', 'boxes', 'active'),
                item('productLine', 'coming', 'coming-soon'),
                item('productLine', 'pouches', 'active'),
            ],
        };
        const mapped = mapProductLinesRow(section);
        assert.deepEqual(
            mapped.cards.map((c) => c.title),
            ['boxes', 'pouches'],
        );
        assert.equal(mapped.cards[0]?.href, '/products/boxes');
    });
});

describe('mapSolutionsRow — status gates (PROD-2845)', () => {
    it('keeps active solutions; drops not-active and missing status', () => {
        const section: PageSectionSolutionsRowDoc = {
            _type: 'solutionsRow',
            _key: 'solutions',
            heading: 'Industries',
            items: [
                item('solution', 'beauty', 'active'),
                item('solution', 'unset'),
                item('solution', 'off', 'not-active'),
                item('solution', 'food', 'active'),
            ],
        };
        const mapped = mapSolutionsRow(section);
        assert.deepEqual(
            mapped.cards.map((c) => c.title),
            ['beauty', 'food'],
        );
        assert.equal(mapped.cards[0]?.href, '/solutions/beauty');
    });
});
