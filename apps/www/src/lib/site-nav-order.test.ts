import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {sortNavLinksByOrderRank} from './site-nav';

describe('sortNavLinksByOrderRank', () => {
    it('orders ranked links by LexoRank string', () => {
        const sorted = sortNavLinksByOrderRank([
            {
                mapped: {label: 'Mailers', href: '/products/mailers'},
                orderRank: '0|c000',
                index: 0,
            },
            {
                mapped: {label: 'Rigid Boxes', href: '/products/rigid-boxes'},
                orderRank: '0|a000',
                index: 1,
            },
            {
                mapped: {
                    label: 'Folding Cartons',
                    href: '/products/folding-cartons',
                },
                orderRank: '0|b000',
                index: 2,
            },
        ]);

        assert.deepEqual(
            sorted.map((link) => link.label),
            ['Rigid Boxes', 'Folding Cartons', 'Mailers'],
        );
    });

    it('puts ranked links before unranked and preserves unranked document order', () => {
        const sorted = sortNavLinksByOrderRank([
            {
                mapped: {label: 'Unranked A', href: '/a'},
                orderRank: null,
                index: 0,
            },
            {
                mapped: {label: 'Ranked B', href: '/b'},
                orderRank: '0|b000',
                index: 1,
            },
            {
                mapped: {label: 'Unranked C', href: '/c'},
                orderRank: null,
                index: 2,
            },
            {
                mapped: {label: 'Ranked A', href: '/d'},
                orderRank: '0|a000',
                index: 3,
            },
        ]);

        assert.deepEqual(
            sorted.map((link) => link.label),
            ['Ranked A', 'Ranked B', 'Unranked A', 'Unranked C'],
        );
    });

    it('keeps document order when nothing is ranked', () => {
        const sorted = sortNavLinksByOrderRank([
            {
                mapped: {label: 'First', href: '/1'},
                orderRank: null,
                index: 0,
            },
            {
                mapped: {label: 'Second', href: '/2'},
                orderRank: null,
                index: 1,
            },
            {
                mapped: {label: 'Third', href: '/3'},
                orderRank: null,
                index: 2,
            },
        ]);

        assert.deepEqual(
            sorted.map((link) => link.label),
            ['First', 'Second', 'Third'],
        );
    });

    it('ties on equal rank fall back to document index', () => {
        const sorted = sortNavLinksByOrderRank([
            {
                mapped: {label: 'Later', href: '/later'},
                orderRank: '0|a000',
                index: 2,
            },
            {
                mapped: {label: 'Earlier', href: '/earlier'},
                orderRank: '0|a000',
                index: 1,
            },
        ]);

        assert.deepEqual(
            sorted.map((link) => link.label),
            ['Earlier', 'Later'],
        );
    });
});
