import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {
    PageSectionDoc,
    PageSectionInspirationsCardDoc,
    PageSectionInspirationsGridDoc,
} from '@pakfactory/sanity/queries';

import {applyInspirationsInherit} from './merge-solution-sections';

describe('applyInspirationsInherit', () => {
    it('fills an empty inspirationsGrid from imageless related styles', () => {
        const sections: PageSectionDoc[] = [
            {
                _type: 'inspirationsGrid',
                _key: 'styles',
                heading: 'Explore every format',
                cards: [],
            } as PageSectionInspirationsGridDoc,
        ];
        const related: PageSectionInspirationsCardDoc[] = [
            {
                kind: 'ref',
                _type: 'solutionStyle',
                title: 'Candle Mailers',
                slug: 'candle-mailers',
                solutionSlug: 'candles-home-fragrance',
            },
            {
                kind: 'ref',
                _type: 'solutionStyle',
                title: 'Missing slug',
                solutionSlug: 'candles-home-fragrance',
            },
        ];

        const [section] = applyInspirationsInherit(
            sections,
            related,
        ) as PageSectionInspirationsGridDoc[];

        assert.equal(section?.cards?.length, 1);
        assert.equal(section?.cards?.[0]?.title, 'Candle Mailers');
        assert.equal(section?.cards?.[0]?.imageSrc, undefined);
    });
});
