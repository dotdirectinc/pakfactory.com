import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {CatalogProductLineDoc} from '@pakfactory/sanity/queries';

import {mapSanityProductLine, mapStyleRef} from './map-sanity';

describe('style pages — only Active / Discontinued styles are linked', () => {
    it('mapStyleRef keeps hasPage only when false', () => {
        assert.equal(mapStyleRef({slug: 'a', title: 'A', hasPage: true})?.hasPage, undefined);
        assert.equal(mapStyleRef({slug: 'b', title: 'B', hasPage: false})?.hasPage, false);
    });

    it("a line's style list drops page-less styles, from the field and from its products", () => {
        const line = mapSanityProductLine({
            _id: 'line',
            title: 'Line',
            slug: 'line',
            styles: [
                {_id: 's1', title: 'Open', slug: 'open', hasPage: true},
                {_id: 's2', title: 'Internal', slug: 'internal', hasPage: false},
            ],
            products: [],
        } as unknown as CatalogProductLineDoc);
        assert.deepEqual(
            line?.styles.map((s) => s.slug),
            ['open'],
        );
    });
});
