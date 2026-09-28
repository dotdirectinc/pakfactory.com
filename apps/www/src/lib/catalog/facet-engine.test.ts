import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {createFacetEngine} from './facet-engine';
import type {CustomizationFacetDef} from './types';

type Item = {
    title: string;
    line: string;
    tags: string[];
};

const facets: CustomizationFacetDef[] = [
    {
        id: 'line',
        title: 'Line',
        options: [
            {value: 'rigid', label: 'Rigid'},
            {value: 'folding', label: 'Folding'},
        ],
    },
    {
        id: 'tag',
        title: 'Tag',
        options: [
            {value: 'eco', label: 'Eco'},
            {value: 'premium', label: 'Premium'},
        ],
    },
];

const items: Item[] = [
    {title: 'Alpha Box', line: 'rigid', tags: ['eco']},
    {title: 'Beta Carton', line: 'folding', tags: ['eco', 'premium']},
    {title: 'Gamma Tray', line: 'rigid', tags: ['premium']},
];

const engine = createFacetEngine<Item>({
    getSearchText: (item) => item.title,
    matchesFacet: (item, facetId, selected) => {
        if (facetId === 'line') return selected.includes(item.line);
        if (facetId === 'tag') {
            return selected.every((slug) => item.tags.includes(slug));
        }
        return false;
    },
});

describe('createFacetEngine', () => {
    it('ANDs search with facets', () => {
        const matched = items.filter((item) =>
            engine.matchesItem(item, {
                query: 'box',
                selections: {line: ['rigid']},
            }),
        );
        assert.deepEqual(
            matched.map((item) => item.title),
            ['Alpha Box'],
        );
    });

    it('ANDs across facet groups', () => {
        const matched = items.filter((item) =>
            engine.matchesItem(item, {
                query: '',
                selections: {line: ['rigid'], tag: ['premium']},
            }),
        );
        assert.deepEqual(
            matched.map((item) => item.title),
            ['Gamma Tray'],
        );
    });

    it('keeps sibling counts via except-self', () => {
        const counts = engine.buildFacetCounts(items, facets, {
            query: '',
            selections: {line: ['rigid']},
        });
        assert.equal(counts.line?.rigid, 2);
        assert.equal(counts.line?.folding, 1);
        assert.equal(counts.tag?.eco, 1);
        assert.equal(counts.tag?.premium, 1);
    });

    it('honors matchesContext as a pre-filter', () => {
        const withContext = createFacetEngine<Item>({
            getSearchText: (item) => item.title,
            matchesFacet: (item, facetId, selected) => {
                if (facetId === 'line') return selected.includes(item.line);
                return false;
            },
            matchesContext: (item) => item.line === 'folding',
        });
        const matched = items.filter((item) =>
            withContext.matchesItem(item, {query: '', selections: {}}),
        );
        assert.deepEqual(
            matched.map((item) => item.title),
            ['Beta Carton'],
        );
    });
});
