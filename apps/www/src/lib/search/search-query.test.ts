import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
    MAX_QUERY_LENGTH,
    normalizeQuery,
    parseTypeFilter,
    resolveHref,
    shapeResponse,
} from './search-query';

const BLOG = 'https://staging-blog.pakfactory.com/blog';

test('normalizeQuery: case, whitespace and length collapse to one cache key', () => {
    assert.equal(normalizeQuery('  Mailer   BOX '), 'mailer box');
    assert.equal(normalizeQuery('mailer\tbox\n'), 'mailer box');
    assert.equal(normalizeQuery(null), '');
    assert.equal(normalizeQuery('x'.repeat(200)).length, MAX_QUERY_LENGTH);
});

test('parseTypeFilter accepts a rail group or a record type, ignores anything else', () => {
    assert.deepEqual(parseTypeFilter('Products'), {facet: 'group', value: 'products'});
    assert.deepEqual(parseTypeFilter('product-line'), {facet: 'type', value: 'product-line'});
    assert.equal(parseTypeFilter('group:products OR 1=1'), null);
    assert.equal(parseTypeFilter(undefined), null);
});

test('resolveHref moves guides to the blog origin and leaves www paths alone', () => {
    assert.equal(resolveHref('/blog/kraft-vs-white', BLOG), `${BLOG}/kraft-vs-white`);
    assert.equal(resolveHref('/blog/x', `${BLOG}/`), `${BLOG}/x`);
    assert.equal(resolveHref('/blogging-tips', BLOG), '/blogging-tips');
    assert.equal(resolveHref('/products/mailer', BLOG), '/products/mailer');
});

test('shapeResponse groups hits in rail order, keeps counts, drops unlinked hits', () => {
    const out = shapeResponse(
        'mailer',
        null,
        {
            nbHits: 4,
            hits: [
                {objectID: 'g', type: 'guide', group: 'guides', title: 'Kraft', href: '/blog/kraft'},
                {objectID: 'p', type: 'product', group: 'products', title: 'Mailer', href: '/products/mailer', parents: ['Line', 3]},
                {objectID: 'x', type: 'product', group: 'products', title: 'No link'},
                {objectID: 's', type: 'solution', group: 'solutions', title: 'Cosmetics', href: '/solutions/cosmetics', kind: ''},
            ],
            facets: {group: {products: 2, guides: 1, solutions: 1}, type: {product: 2}},
            queryID: 'abc123',
        },
        BLOG,
    );
    assert.deepEqual(out.groups.map((g) => g.group), ['products', 'solutions', 'guides']);
    assert.deepEqual(out.groups[0]!.hits.map((h) => h.id), ['p']);
    assert.deepEqual(out.groups[0]!.hits[0]!.parents, ['Line']);
    assert.equal(out.groups[1]!.hits[0]!.kind, null);
    assert.equal(out.groups[2]!.hits[0]!.href, `${BLOG}/kraft`);
    assert.equal(out.total, 4);
    assert.equal(out.queryID, 'abc123');
    // Position is the rank in Algolia's response, before grouping.
    assert.equal(out.groups[0]!.hits[0]!.position, 2);
    assert.equal(out.groups[2]!.hits[0]!.position, 1);
    assert.deepEqual(out.counts.group, {products: 2, guides: 1, solutions: 1});
});
