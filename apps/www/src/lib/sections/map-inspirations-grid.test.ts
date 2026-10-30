import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {
    PageSectionInspirationsCardDoc,
    PageSectionInspirationsGridDoc,
} from '@pakfactory/sanity/queries';

import {mapInspirationsGrid} from './map-inspirations-grid';

function grid(
    cards: PageSectionInspirationsCardDoc[],
): PageSectionInspirationsGridDoc {
    return {
        _type: 'inspirationsGrid',
        _key: 'styles',
        heading: 'Explore every format',
        cards,
    };
}

describe('mapInspirationsGrid', () => {
    it('keeps a solution-style card with no cover image', () => {
        const mapped = mapInspirationsGrid(
            grid([
                {
                    kind: 'ref',
                    _type: 'solutionStyle',
                    title: 'Candle Mailers',
                    slug: 'candle-mailers',
                    solutionSlug: 'candles-home-fragrance',
                    description: 'Protect glass jars in transit.',
                },
            ]),
        );

        assert.equal(mapped.cards.length, 1);
        assert.equal(mapped.cards[0]?.title, 'Candle Mailers');
        assert.equal(
            mapped.cards[0]?.href,
            '/solutions/candles-home-fragrance/candle-mailers',
        );
        assert.equal(mapped.cards[0]?.image, undefined);
        assert.equal(
            mapped.cards[0]?.description,
            'Protect glass jars in transit.',
        );
    });

    it('maps a card with a cover image', () => {
        const mapped = mapInspirationsGrid(
            grid([
                {
                    kind: 'ref',
                    _type: 'solutionStyle',
                    title: 'Cosmetic Mailers',
                    slug: 'mailers',
                    solutionSlug: 'beauty-cosmetics',
                    imageSrc: 'https://cdn.example/mailer.jpg',
                    imageAlt: 'Cosmetic mailer',
                },
            ]),
        );

        assert.equal(mapped.cards.length, 1);
        assert.deepEqual(mapped.cards[0]?.image, {
            src: 'https://cdn.example/mailer.jpg',
            alt: 'Cosmetic mailer',
        });
    });

    it('drops cards without a title or resolvable href', () => {
        const mapped = mapInspirationsGrid(
            grid([
                {
                    kind: 'ref',
                    _type: 'solutionStyle',
                    slug: 'orphan',
                    solutionSlug: 'beauty-cosmetics',
                    imageSrc: 'https://cdn.example/x.jpg',
                },
                {
                    kind: 'ref',
                    _type: 'solutionStyle',
                    title: 'No route',
                    slug: 'no-route',
                },
            ]),
        );

        assert.deepEqual(mapped.cards, []);
    });
});
