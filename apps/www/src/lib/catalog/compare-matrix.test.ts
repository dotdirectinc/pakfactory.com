import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
    buildCompareMatrix,
    buildReferenceSpecRows,
    buildSustainabilitySpecRows,
    COMPARE_EMPTY_CELL,
    selectCompareMenuOptions,
    selectDefaultComparePeers,
    specRowValues,
} from './compare-matrix';
import type {CustomizationDetail} from './types';

function detail(
    partial: Partial<CustomizationDetail> &
        Pick<CustomizationDetail, 'id' | 'title' | 'slug' | 'categoryValue'>,
): CustomizationDetail {
    return {
        categoryLabel: partial.categoryLabel ?? partial.categoryValue,
        media: [],
        showcaseSolutions: [],
        showcaseCaseStudies: [],
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

describe('buildSustainabilitySpecRows (PROD-3120)', () => {
    const coating = detail({
        id: 'aq',
        title: 'AQ Coating (Aqueous)',
        slug: 'aq-coating-aqueous',
        categoryValue: 'finishing',
        declaredProperties: [
            {
                usage: 'stated',
                propertySlug: 'sustainability',
                propertyTitle: 'Sustainability',
            },
            {
                usage: 'stated',
                propertySlug: 'durability',
                propertyTitle: 'Durability',
            },
            {
                usage: 'stated',
                propertySlug: 'material-source',
                propertyTitle: 'Material Source',
                showOnDetailPage: false,
            },
        ],
        properties: [
            {
                id: 's1',
                title: 'Low VOC',
                slug: 'low-voc',
                propertySlug: 'sustainability',
                propertyTitle: 'Sustainability',
                facts: [{label: 'x', display: 'Low VOC Emissions'}],
            },
            {
                id: 's2',
                title: 'Recycling-Friendly',
                slug: 'recycling-friendly',
                propertySlug: 'sustainability',
                propertyTitle: 'Sustainability',
                facts: [{label: 'x', display: 'Recycling-Friendly'}],
            },
            {
                id: 'd1',
                title: 'High',
                slug: 'high',
                propertySlug: 'durability',
                propertyTitle: 'Durability',
                facts: [{label: 'x', display: 'High'}],
            },
            {
                id: 'src',
                title: 'Virgin Fiber',
                slug: 'virgin-fiber',
                propertySlug: 'material-source',
                facts: [],
            },
        ],
    });

    it('keeps sustainability stated rows and drops other stated rows', () => {
        const rows = buildSustainabilitySpecRows(coating);
        assert.deepEqual(
            rows.map((r) => r.label),
            ['Sustainability'],
        );
        assert.equal(
            rows[0]?.value,
            'Low VOC Emissions · Recycling-Friendly',
        );
    });

    it('splits joined sustainability values for the hero icons', () => {
        const rows = buildSustainabilitySpecRows(coating);
        assert.deepEqual(specRowValues(rows[0]!), [
            'Low VOC Emissions',
            'Recycling-Friendly',
        ]);
    });

    it('omits hidden stated sustainability', () => {
        const hidden = detail({
            id: 'hidden',
            title: 'Hidden',
            slug: 'hidden',
            categoryValue: 'finishing',
            declaredProperties: [
                {
                    usage: 'stated',
                    propertySlug: 'sustainability',
                    propertyTitle: 'Sustainability',
                    showOnDetailPage: false,
                },
            ],
            properties: [
                {
                    id: 's',
                    title: 'Recyclable',
                    slug: 'recyclable',
                    propertySlug: 'sustainability',
                    facts: [],
                },
            ],
        });
        assert.deepEqual(buildSustainabilitySpecRows(hidden), []);
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
            ['fiber'],
        );
        assert.equal(matrix.rows[0]?.valuesById.metallic, 'Virgin fibre core');
        assert.equal(matrix.rows[0]?.valuesById.sbs, '100% Bleached');
    });

    it('keeps a single-column matrix’s stated rows', () => {
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
        assert.deepEqual(
            matrix.rows.map((r) => r.key),
            ['fiber'],
        );
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

describe('hidden stated properties (showOnDetailPage false)', () => {
    // The content team's "Stated (hidden)" columns — Material Source here — filter listings
    // but are not printed: neither as a spec row nor as a compare row.
    const board = (id: string, source: string) =>
        detail({
            id,
            title: id,
            slug: id,
            categoryValue: 'materials',
            declaredProperties: [
                {usage: 'stated', propertySlug: 'material-source', propertyTitle: 'Material Source', showOnDetailPage: false},
                {usage: 'stated', propertySlug: 'print-quality', propertyTitle: 'Print Quality'},
            ],
            properties: [
                {id: `${id}-src`, title: source, slug: source.toLowerCase(), propertySlug: 'material-source', facts: []},
                {id: `${id}-pq`, title: 'Excellent', slug: 'excellent', propertySlug: 'print-quality', facts: []},
            ],
        });

    it('leaves them out of Specs & performance, and keeps the shown ones', () => {
        const rows = buildReferenceSpecRows(board('sbs', 'Virgin Fiber'));
        assert.deepEqual(rows.map((r) => r.label), ['Print Quality']);
    });

    it('leaves them out of the compare matrix', () => {
        const matrix = buildCompareMatrix([board('sbs', 'Virgin Fiber'), board('cuk', 'Recycled Fiber')]);
        assert.deepEqual(matrix.rows.map((r) => r.label), ['Print Quality']);
    });
});

describe('selectDefaultComparePeers', () => {
    function option(
        id: string,
        title: string,
        typeSlug: string | undefined,
        axes: string[],
    ): CustomizationDetail {
        return detail({
            id,
            title,
            slug: id,
            categoryValue: 'materials',
            ...(typeSlug ? {typeSlug} : {}),
            declaredProperties: axes.map((slug) => ({
                usage: 'stated' as const,
                propertySlug: slug,
                propertyTitle: slug,
            })),
            properties: axes.map((slug) => ({
                id: `${id}-${slug}`,
                title: slug,
                slug,
                propertySlug: slug,
                facts: [{label: 'x', display: slug}],
            })),
        });
    }

    it('prefers same-type siblings over earlier alphabetical peers', () => {
        const abs = option('abs', 'ABS', 'rigid-plastic', [
            'clarity',
            'rigidity',
        ]);
        const aluminum = option('aluminum', 'Aluminum', 'metal', ['weight']);
        const foam = option('foam', 'Anti-Static Foam', 'foam', ['firmness']);
        const pet = option('pet', 'PET / RPET', 'rigid-plastic', [
            'clarity',
            'rigidity',
        ]);
        const pvc = option('pvc', 'Rigid PVC', 'rigid-plastic', [
            'clarity',
            'rigidity',
        ]);

        const selected = selectDefaultComparePeers(abs, [
            aluminum,
            foam,
            pet,
            pvc,
        ]);
        assert.deepEqual(
            selected.map((p) => p.id),
            ['pet', 'pvc'],
        );
    });

    it('fills remaining slots with the neighbour that shares the most axes', () => {
        const abs = option('abs', 'ABS', 'rigid-plastic', [
            'clarity',
            'rigidity',
            'cost',
        ]);
        const pet = option('pet', 'PET / RPET', 'rigid-plastic', [
            'clarity',
            'rigidity',
        ]);
        const metal = option('aluminum', 'Aluminum', 'metal', ['weight']);
        const nearby = option('nearby', 'Nearby Plastic', 'other-plastic', [
            'clarity',
            'cost',
        ]);

        const selected = selectDefaultComparePeers(abs, [metal, nearby, pet]);
        assert.deepEqual(
            selected.map((p) => p.id),
            ['pet', 'nearby'],
        );
    });

    it('ranks the whole category by overlap when the current option has no type', () => {
        const current = option('abs', 'ABS', undefined, ['clarity', 'cost']);
        const aluminum = option('aluminum', 'Aluminum', 'metal', ['weight']);
        const pet = option('pet', 'PET / RPET', 'rigid-plastic', [
            'clarity',
            'cost',
        ]);
        const foam = option('foam', 'Foam', 'foam', ['clarity']);

        const selected = selectDefaultComparePeers(current, [
            aluminum,
            foam,
            pet,
        ]);
        assert.deepEqual(
            selected.map((p) => p.id),
            ['pet', 'foam'],
        );
    });
});

describe('selectCompareMenuOptions', () => {
    function option(
        id: string,
        title: string,
        typeSlug: string | undefined,
    ): CustomizationDetail {
        return detail({
            id,
            title,
            slug: id,
            categoryValue: 'materials',
            ...(typeSlug ? {typeSlug} : {}),
        });
    }

    it('lists same-type siblings, not other types in the category', () => {
        const abs = option('abs', 'ABS', 'rigid-plastic');
        const aluminum = option('aluminum', 'Aluminum', 'metal');
        const pet = option('pet', 'PET / RPET', 'rigid-plastic');
        const pvc = option('pvc', 'Rigid PVC', 'rigid-plastic');

        const selected = selectCompareMenuOptions(abs, [
            aluminum,
            pet,
            pvc,
        ]);
        assert.deepEqual(
            selected.map((p) => p.id),
            ['abs', 'pet', 'pvc'],
        );
    });

    it('lists the whole category when the current option has no type', () => {
        const current = option('abs', 'ABS', undefined);
        const aluminum = option('aluminum', 'Aluminum', 'metal');
        const pet = option('pet', 'PET / RPET', 'rigid-plastic');

        const selected = selectCompareMenuOptions(current, [aluminum, pet]);
        assert.deepEqual(
            selected.map((p) => p.id),
            ['abs', 'aluminum', 'pet'],
        );
    });
});
