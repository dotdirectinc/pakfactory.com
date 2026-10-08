import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    assertCompatibilityCategorySlugs,
    COMPATIBILITY_RESERVED_CATALOG_KEYS,
    COMPATIBILITY_RESERVED_CATEGORY_SLUG,
    parseCompatibilityQuery,
    serializeCompatibilityQuery,
    withCompatibilityQuery,
    type CompatibilityQuery,
} from './compatibility-query';

describe('assertCompatibilityCategorySlugs', () => {
    it('rejects the reserved compatibility path segment', () => {
        assert.throws(
            () =>
                assertCompatibilityCategorySlugs([
                    COMPATIBILITY_RESERVED_CATEGORY_SLUG,
                ]),
            /reserved/,
        );
    });

    it('rejects catalog facet keys', () => {
        for (const key of COMPATIBILITY_RESERVED_CATALOG_KEYS) {
            assert.throws(
                () => assertCompatibilityCategorySlugs([key]),
                /collides/,
            );
        }
        assert.throws(
            () => assertCompatibilityCategorySlugs(['property.foo']),
            /collides/,
        );
    });

    it('allows normal customization category slugs', () => {
        assert.doesNotThrow(() =>
            assertCompatibilityCategorySlugs([
                'materials',
                'additional-customization',
                'printing',
            ]),
        );
    });
});

describe('parseCompatibilityQuery / serializeCompatibilityQuery', () => {
    it('round-trips category options and scoped properties', () => {
        const raw =
            'additional-customization=adhesive-strip%2Cwindow-patch&materials=black-chipboard-pure-black-core&materials.thickness=1.5mm';
        const parsed = parseCompatibilityQuery(new URLSearchParams(raw));
        assert.deepEqual(parsed.selections, [
            {
                category: 'additional-customization',
                optionSlug: 'adhesive-strip',
            },
            {
                category: 'additional-customization',
                optionSlug: 'window-patch',
            },
            {
                category: 'materials',
                optionSlug: 'black-chipboard-pure-black-core',
            },
        ]);
        assert.deepEqual(parsed.properties, [
            {
                category: 'materials',
                propertyKey: 'thickness',
                valueSlugs: ['1.5mm'],
            },
        ]);

        const serialized = serializeCompatibilityQuery(parsed);
        const again = parseCompatibilityQuery(new URLSearchParams(serialized));
        assert.deepEqual(again.selections, parsed.selections);
        assert.deepEqual(again.properties, parsed.properties);
        // Canonical order: category keys sorted.
        assert.equal(
            serialized,
            'additional-customization=adhesive-strip%2Cwindow-patch&materials=black-chipboard-pure-black-core&materials.thickness=1.5mm',
        );
    });

    it('same selection always serializes the same way', () => {
        const query: CompatibilityQuery = {
            selections: [
                {category: 'materials', optionSlug: 'kraft'},
                {category: 'materials', optionSlug: 'sbs'},
                {
                    category: 'additional-customization',
                    optionSlug: 'window-patch',
                },
            ],
            properties: [
                {
                    category: 'materials',
                    optionSlug: 'kraft',
                    propertyKey: 'thickness',
                    valueSlugs: ['2mm', '1.5mm'],
                },
            ],
        };
        const a = serializeCompatibilityQuery(query);
        const b = serializeCompatibilityQuery({
            selections: [...query.selections].reverse(),
            properties: [...query.properties],
        });
        assert.equal(a, b);
    });

    it('ignores catalog facet keys, utm_*, and ref', () => {
        const params = new URLSearchParams(
            'materials=kraft&q=box&product-line=rigid-boxes&utm_source=sales&ref=rep-1&industry=beauty',
        );
        const parsed = parseCompatibilityQuery(params);
        assert.deepEqual(parsed.selections, [
            {category: 'materials', optionSlug: 'kraft'},
        ]);
        assert.equal(parsed.properties.length, 0);
        const out = serializeCompatibilityQuery(parsed);
        assert.equal(out, 'materials=kraft');
        assert.ok(!out.includes('utm_'));
        assert.ok(!out.includes('ref='));
        assert.ok(!out.includes('q='));
    });

    it('parses variant but does not write it by default', () => {
        const parsed = parseCompatibilityQuery(
            new URLSearchParams('materials=kraft&variant=b'),
        );
        assert.equal(parsed.variant, 'b');
        assert.equal(serializeCompatibilityQuery(parsed), 'materials=kraft');
        assert.equal(
            serializeCompatibilityQuery(parsed, {includeVariant: true}),
            'materials=kraft&variant=b',
        );
    });

    it('uses bare property keys on the single-option path', () => {
        const pathSelection = {
            category: 'materials',
            optionSlug: 'black-chipboard-pure-black-core',
        };
        const parsed = parseCompatibilityQuery(
            new URLSearchParams('thickness=1.5mm'),
            {pathSelection},
        );
        assert.deepEqual(parsed.selections, [pathSelection]);
        assert.deepEqual(parsed.properties, [
            {
                category: 'materials',
                optionSlug: 'black-chipboard-pure-black-core',
                propertyKey: 'thickness',
                valueSlugs: ['1.5mm'],
            },
        ]);
        assert.equal(
            serializeCompatibilityQuery(parsed, {pathSelection}),
            'thickness=1.5mm',
        );
    });

    it('uses the long property form when two options share a property key', () => {
        const query: CompatibilityQuery = {
            selections: [
                {category: 'materials', optionSlug: 'kraft'},
                {category: 'materials', optionSlug: 'sbs'},
            ],
            properties: [
                {
                    category: 'materials',
                    optionSlug: 'kraft',
                    propertyKey: 'thickness',
                    valueSlugs: ['1.5mm'],
                },
                {
                    category: 'materials',
                    optionSlug: 'sbs',
                    propertyKey: 'thickness',
                    valueSlugs: ['2mm'],
                },
            ],
        };
        const qs = serializeCompatibilityQuery(query);
        assert.ok(qs.includes('materials.kraft.thickness=1.5mm'));
        assert.ok(qs.includes('materials.sbs.thickness=2mm'));
        const again = parseCompatibilityQuery(new URLSearchParams(qs));
        assert.equal(again.properties.length, 2);
        assert.ok(again.properties.every((p) => p.optionSlug));
    });

    it('withCompatibilityQuery appends only when non-empty', () => {
        assert.equal(
            withCompatibilityQuery('/customizations/compatibility', {
                selections: [],
                properties: [],
            }),
            '/customizations/compatibility',
        );
        assert.equal(
            withCompatibilityQuery('/customizations/compatibility', {
                selections: [{category: 'materials', optionSlug: 'kraft'}],
                properties: [],
            }),
            '/customizations/compatibility?materials=kraft',
        );
    });
});
