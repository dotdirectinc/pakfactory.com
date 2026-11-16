import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {allowsIdlePrompt, chatPageType} from './page-type';

describe('chatPageType', () => {
    it('reads the first path segment', () => {
        assert.equal(chatPageType('/'), 'home');
        assert.equal(chatPageType(null), 'home');
        assert.equal(chatPageType('/products'), 'products');
        assert.equal(chatPageType('/products/mailer-boxes'), 'products');
        assert.equal(chatPageType('/compare/products'), 'compare');
        assert.equal(chatPageType('/request/details'), 'request');
        assert.equal(chatPageType('/login'), 'auth');
        assert.equal(chatPageType('/about'), 'other');
    });

    it('lets the page context make it exact', () => {
        assert.equal(chatPageType('/products/mailer-box', {kind: 'product', name: 'Mailer Box', slug: 'mailer-box'}), 'product');
        assert.equal(chatPageType('/x', {kind: 'compare', group: 'Boxes', items: ['A', 'B']}), 'compare');
    });
});

describe('allowsIdlePrompt', () => {
    it('never prompts on forms or signed-in tasks', () => {
        for (const t of ['request', 'contact', 'account', 'auth'] as const) assert.equal(allowsIdlePrompt(t), false);
        for (const t of ['home', 'product', 'products', 'compare'] as const) assert.equal(allowsIdlePrompt(t), true);
    });
});
