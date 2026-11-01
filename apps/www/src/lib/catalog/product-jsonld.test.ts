import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {formatLeadTimeBusinessDays} from '@/lib/copy/product-detail';

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

describe('PDP additionalProperty — lead time must say what the rail says (PROD-3232)', () => {
    const props = (extra: Partial<Product>) => {
        const nodes = JSON.parse(
            buildProductDetailJsonLd(product(extra), null),
        )['@graph'] as Record<string, unknown>[];
        const prod = nodes.find((n) => n['@type'] === 'Product');
        return (prod?.additionalProperty ?? []) as {
            name: string;
            value: string;
        }[];
    };

    it('states the lead time the visible rail states, character for character', () => {
        const leadTime = props({
            leadTimeBusinessDaysMin: 20,
            leadTimeBusinessDaysMax: 25,
        }).find((pair) => pair.name === 'Lead time');

        assert.ok(leadTime, 'a product with a lead time should declare one');
        // Pinned to the rail's own formatter. If these ever diverge the markup
        // contradicts the visible page, which is the real manual-action risk.
        assert.equal(leadTime.value, formatLeadTimeBusinessDays(20, 25));
        assert.equal(leadTime.value, '20\u201325 business days');
    });

    it('collapses a single fixed lead time exactly as the rail does', () => {
        assert.equal(
            props({
                leadTimeBusinessDaysMin: 18,
                leadTimeBusinessDaysMax: 18,
            }).find((pair) => pair.name === 'Lead time')?.value,
            formatLeadTimeBusinessDays(18, 18),
        );
    });

    it('omits the pair entirely when there is no lead-time data', () => {
        const pairs = props({moq: 500});
        assert.equal(
            pairs.some((pair) => pair.name === 'Lead time'),
            false,
            'no lead time is an absent pair, never an empty one',
        );
        // MOQ still ships, so the absence is specific rather than a blanket drop.
        assert.ok(pairs.some((pair) => pair.name === 'Minimum order quantity'));
    });
});
