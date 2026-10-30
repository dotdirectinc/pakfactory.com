import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {buildProductDetailBreadcrumbs, buildProductDetailJsonLd} from './product-jsonld';
import type {Product} from './types';

const product = (extra: Partial<Product> = {}): Product =>
    ({
        title: 'Watch Box',
        slug: 'watch-box',
        sku: '',
        kind: 'standard',
        media: [],
        description: '',
        productLine: {slug: 'rigid-boxes', title: 'Rigid Boxes'},
        productStyle: {slug: 'magnetic', title: 'Magnetic Closure'},
        availableCustomizations: [],
        ...extra,
    }) as Product;

describe('PDP breadcrumb — the primary parent is fixed (2026-10-06)', () => {
    it('links every crumb when no flags are given', () => {
        const crumbs = buildProductDetailBreadcrumbs(product());
        assert.deepEqual(
            crumbs.map((c) => Boolean(c.href)),
            [true, true, true, false],
        );
    });

    it('keeps an off primary style as text, never a substitute', () => {
        const crumbs = buildProductDetailBreadcrumbs(
            product({breadcrumbLinks: {line: true, style: false, parent: false}}),
        );
        assert.equal(crumbs[2]?.label, 'Magnetic Closure');
        assert.equal(crumbs[2]?.href, undefined);
    });

    it('keeps an off primary solution as text and drops its solution style', () => {
        const crumbs = buildProductDetailBreadcrumbs(
            product({
                kind: 'inspiration',
                breadcrumbParent: {title: 'Jewelry', slug: 'jewelry'},
                breadcrumbStyle: {title: 'Rings', slug: 'rings'},
                breadcrumbLinks: {line: true, style: true, parent: false},
            }),
        );
        assert.deepEqual(crumbs, [{label: 'Jewelry'}, {label: 'Watch Box'}]);
    });

    it('leaves text-only crumbs out of the JSON-LD', () => {
        const json = buildProductDetailJsonLd(
            product({
                kind: 'inspiration',
                breadcrumbParent: {title: 'Jewelry', slug: 'jewelry'},
                breadcrumbLinks: {line: true, style: true, parent: false},
            }),
        );
        assert.equal(json.includes('Jewelry'), false);
        assert.equal(json.includes('Watch Box'), true);
    });
});

describe('PDP Organization — the node has to exist before brand can point at it', () => {
    const company = {
        name: 'PakFactory',
        logoUrl: 'https://cdn.sanity.io/logo.png',
        description: 'A custom packaging manufacturer.',
        sameAs: ['https://www.linkedin.com/company/pakfactory'],
    };

    const graph = (companyRecord: typeof company | null) =>
        JSON.parse(buildProductDetailJsonLd(product(), companyRecord))[
            '@graph'
        ] as Record<string, unknown>[];

    it('emits the Organization node and points brand at its @id', () => {
        const nodes = graph(company);
        const org = nodes.find((n) => n['@type'] === 'Organization');
        const prod = nodes.find((n) => n['@type'] === 'Product');

        assert.ok(org, 'the graph should carry an Organization node');
        assert.equal(org.name, 'PakFactory');
        assert.equal(org.description, 'A custom packaging manufacturer.');
        assert.deepEqual(org.sameAs, [
            'https://www.linkedin.com/company/pakfactory',
        ]);
        // The pointer must resolve inside this same graph, not dangle.
        assert.deepEqual(prod?.brand, {'@id': org['@id']});
    });

    it('omits both the node and brand when there is no company record', () => {
        const nodes = graph(null);
        assert.equal(
            nodes.some((n) => n['@type'] === 'Organization'),
            false,
        );
        const prod = nodes.find((n) => n['@type'] === 'Product');
        assert.ok(prod);
        assert.equal(
            'brand' in prod,
            false,
            'brand must not point at a node that is not in the graph',
        );
    });
});
