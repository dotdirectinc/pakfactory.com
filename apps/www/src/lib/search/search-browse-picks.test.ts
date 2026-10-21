import assert from 'node:assert/strict';
import {test} from 'node:test';

import type {SiteSearchRecord} from '@pakfactory/sanity/algolia/site-search';

import {
    pickCustomizations,
    pickProductLines,
    pickProducts,
    toBrowseItem,
    type BrowseLine,
} from './search-browse-picks';

const BLOG = 'https://staging-blog.pakfactory.com/blog';

const record = (over: Partial<SiteSearchRecord>): SiteSearchRecord => ({
    objectID: 'x',
    type: 'customization',
    group: 'customizations',
    typeRank: 4,
    kind: null,
    sku: null,
    title: 'X',
    href: '/customizations/printing/x',
    summary: '',
    image: null,
    imageAlt: '',
    parents: ['Ink', 'Printing'],
    tags: [],
    publishedAtTimestamp: 0,
    ...over,
});

test("pickProducts: the biggest lines first, each line's first product with an image", () => {
    const line = (slug: string, productCount: number, first: string | null): BrowseLine => ({
        record: record({
            type: 'product-line',
            group: 'products',
            title: slug,
            href: `/products/${slug}`,
        }),
        shortName: null,
        productCount,
        firstProduct: first
            ? record({
                  objectID: first,
                  type: 'product',
                  group: 'products',
                  title: first,
                  href: `/products/${first}`,
                  image: 'img',
              })
            : null,
    });
    const picks = pickProducts(
        [
            line('tins', 9, null),
            line('mailers', 20, 'kraft-mailers'),
            line('rigid', 40, 'drawer-box'),
        ],
        BLOG,
    );
    assert.deepEqual(
        picks.map((p) => p.href),
        ['/products/drawer-box', '/products/kraft-mailers'],
        'rigid (40) before mailers (20); tins has no product with an image',
    );
});

test("pickProductLines: short name first, the line's own or fallback image", () => {
    const rows = pickProductLines([
        {
            record: record({
                title: 'Fabric Gift Bags & Pouches',
                href: '/products/fabric',
                image: 'img',
                imageAlt: '',
            }),
            shortName: 'Fabric Bags',
            productCount: 3,
            firstProduct: null,
        },
    ]);
    assert.deepEqual(rows, [
        {
            title: 'Fabric Bags',
            href: '/products/fabric',
            image: 'img',
            imageAlt: 'Fabric Gift Bags & Pouches',
        },
    ]);
});

test('pickCustomizations: category pills to the filtered catalog + 2 options each', () => {
    const {categories, options} = pickCustomizations(
        [
            record({
                objectID: 'a',
                href: '/customizations/printing/a',
                parents: ['Ink', 'Printing'],
            }),
            record({
                objectID: 'b',
                href: '/customizations/printing/b',
                parents: ['Ink', 'Printing'],
            }),
            record({
                objectID: 'c',
                href: '/customizations/printing/c',
                parents: ['Ink', 'Printing'],
            }),
            record({
                objectID: 'd',
                href: '/customizations/finishing/d',
                parents: ['Foil', 'Finishing'],
            }),
            record({objectID: 'bad', href: '/products/oops'}),
        ],
        BLOG,
    );
    assert.deepEqual(categories, [
        {label: 'Finishing', href: '/customizations?category=finishing'},
        {label: 'Printing', href: '/customizations?category=printing'},
    ]);
    assert.deepEqual(
        options.map((o) => o.id),
        ['d', 'a', 'b'],
    );
});

test('toBrowseItem resolves guide links to the blog origin and drops records without a link', () => {
    assert.equal(
        toBrowseItem(record({type: 'guide', href: '/blog/kraft'}), BLOG)?.href,
        `${BLOG}/kraft`,
    );
    assert.equal(toBrowseItem(record({href: ''}), BLOG), null);
});
