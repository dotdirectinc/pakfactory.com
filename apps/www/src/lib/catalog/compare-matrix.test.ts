import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
    buildCompareMatrix,
    buildReferenceSpecRows,
    COMPARE_EMPTY_CELL,
} from './compare-matrix';
import type {CustomizationDetail} from './types';

function detail(
    partial: Partial<CustomizationDetail> &
        Pick<CustomizationDetail, 'id' | 'title' | 'slug' | 'categoryValue'>,
): CustomizationDetail {
    return {
        categoryLabel: partial.categoryLabel ?? partial.categoryValue,
        media: [],
        properties: [],
        declaredProperties: [],
        productLines: [],
        ...partial,
    };
}

describe('buildReferenceSpecRows', () => {
    it('returns stated property rows with fact displays', () => {
        const rows = buildReferenceSpecRows(
            detail({
                id: 'a',
                title: 'Metallic',
                slug: 'metallic',
                categoryValue: 'materials',
                declaredProperties: [
                    {
                        usage: 'stated',
                        propertySlug: 'fiber',
                        propertyTitle: 'Fiber Source',
                    },
                    {
                        usage: 'selectable',
                        propertySlug: 'caliper',
                        propertyTitle: 'Caliper',
                    },
                ],
                properties: [
                    {
                        id: 'pv1',
                        title: 'Virgin',
                        slug: 'virgin',
                        propertySlug: 'fiber',
                        propertyTitle: 'Fiber Source',
                        facts: [{label: 'Source', display: 'Virgin fibre'}],
                    },
                ],
            }),
        );
        assert.equal(rows.length, 1);
        assert.equal(rows[0]?.label, 'Fiber Source');
        assert.equal(rows[0]?.value, 'Virgin fibre');
    });
});

describe('buildCompareMatrix', () => {
    it('puts the current option first and aligns shared rows', () => {
        const current = detail({
            id: 'metallic',
            title: 'Metallic',
            slug: 'metallic-paperboard',
            categoryValue: 'materials',
            declaredProperties: [
                {
                    usage: 'stated',
                    propertySlug: 'fiber',
                    propertyTitle: 'Fiber Source',
                },
                {
                    usage: 'stated',
                    propertySlug: 'cost',
                    propertyTitle: 'Cost',
                },
            ],
            properties: [
                {
                    id: 'm-fiber',
                    title: 'Virgin',
                    slug: 'virgin',
                    propertySlug: 'fiber',
                    facts: [{label: 'x', display: 'Virgin fibre core'}],
                },
                {
                    id: 'm-cost',
                    title: 'Premium',
                    slug: 'premium',
                    propertySlug: 'cost',
                    facts: [{label: 'x', display: 'Premium'}],
                },
            ],
        });
        const peer = detail({
            id: 'sbs',
            title: 'SBS',
            slug: 'sbs-paperboard',
            categoryValue: 'materials',
            declaredProperties: [
                {
                    usage: 'stated',
                    propertySlug: 'fiber',
                    propertyTitle: 'Fiber Source',
                },
                {
                    usage: 'stated',
                    propertySlug: 'print',
                    propertyTitle: 'Print Quality',
                },
            ],
            properties: [
                {
                    id: 's-fiber',
                    title: 'Bleached',
                    slug: 'bleached',
                    propertySlug: 'fiber',
                    facts: [{label: 'x', display: '100% Bleached'}],
                },
                {
                    id: 's-print',
                    title: 'Excellent',
                    slug: 'excellent',
                    propertySlug: 'print',
                    facts: [{label: 'x', display: 'Excellent'}],
                },
            ],
        });

        const matrix = buildCompareMatrix([current, peer, null]);
        assert.deepEqual(
            matrix.columns.map((c) => c.id),
            ['metallic', 'sbs'],
        );
        assert.deepEqual(
            matrix.rows.map((r) => r.key),
            ['fiber', 'cost', 'print'],
        );
        assert.equal(matrix.rows[0]?.valuesById.metallic, 'Virgin fibre core');
        assert.equal(matrix.rows[0]?.valuesById.sbs, '100% Bleached');
        assert.equal(matrix.rows[1]?.valuesById.metallic, 'Premium');
        assert.equal(matrix.rows[1]?.valuesById.sbs, undefined);
        assert.equal(matrix.rows[2]?.valuesById.sbs, 'Excellent');
    });

    it('omits null slots from columns and leaves missing cells empty', () => {
        const only = detail({
            id: 'solo',
            title: 'Solo',
            slug: 'solo',
            categoryValue: 'materials',
            declaredProperties: [
                {
                    usage: 'stated',
                    propertySlug: 'fiber',
                    propertyTitle: 'Fiber',
                },
            ],
            properties: [
                {
                    id: 'f',
                    title: 'A',
                    slug: 'a',
                    propertySlug: 'fiber',
                    facts: [{label: 'x', display: 'A'}],
                },
            ],
        });
        const matrix = buildCompareMatrix([only, null, null]);
        assert.equal(matrix.columns.length, 1);
        assert.equal(matrix.rows.length, 1);
        assert.equal(
            matrix.rows[0]?.valuesById.missing,
            undefined,
        );
        assert.equal(COMPARE_EMPTY_CELL, '—');
    });
});
