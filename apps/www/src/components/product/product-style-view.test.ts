import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {styleHeroDescription} from './product-style-view';

describe('styleHeroDescription (PROD-2980)', () => {
    it('uses the long description and ignores the short description', () => {
        assert.equal(
            styleHeroDescription({
                description:
                    'Book style rigid boxes open along a spine exactly like a hardcover book.',
                shortDescription:
                    'Custom printed rigid boxes that open along a spine like a hardcover book.',
            }),
            'Book style rigid boxes open along a spine exactly like a hardcover book.',
        );
    });

    it('leaves the hero intro blank when description is empty', () => {
        assert.equal(
            styleHeroDescription({
                description: '  ',
                shortDescription: 'A built-in hang tab hooks onto a peg wall.',
            }),
            undefined,
        );
    });
});
