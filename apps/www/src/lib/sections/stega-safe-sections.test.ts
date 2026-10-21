import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import type {PageSectionDoc} from '@pakfactory/sanity/queries';

import {mapSectionAlign, mapSectionPaddingBlock} from './map-section-chrome';
import {applyFaqInherit, shouldInheritSectionList} from './merge-solution-sections';

/**
 * Draft mode (Presentation / staging preview) stega-encodes Studio strings:
 * the value is followed by invisible characters. Fixture = "page" encoded by
 * @vercel/stega (what the drafts client emits), frozen here as escapes.
 */
const withStega = (value: string) =>
    value + '\u200b\u200b\u200b\u200b\u200c\ufeff\u200d\ufeff\u200b\u200d\u200b\u200d\u200c\u200d\ufeff\ufeff\u200c\ufeff\u200b\u200d\u200c\u200d\u200d\u200c\u200c\u200d\u200c\ufeff\u200c\u200d\u200d\u200c\u200c\u200d\ufeff\u200d\u200b\u200d\u200b\u200d\u200b\ufeff\u200d\u200d\u200b\u200d\u200b\u200d\u200c\ufeff\u200b\ufeff\u200c\u200d\u200b\u200c\u200c\u200d\ufeff\u200d\u200c\u200d\u200d\u200c\u200c\ufeff\u200c\u200b\u200c\ufeff\u200d\u200c\u200b\u200d\ufeff\u200d\u200c\u200d\u200d\u200c\u200c\u200d\ufeff\ufeff\u200b\u200d\u200b\u200d\u200b\u200d\ufeff\u200b\u200b\u200d\u200b\u200d\u200c\u200d\u200d\u200b\u200c\ufeff\u200b\u200d\u200c\u200d\u200c\u200c\u200c\u200d\u200c\u200d\u200b\u200d\u200b\u200d\u200b\ufeff\u200d\u200d\u200b\u200d\u200b\u200d\u200b\u200d\ufeff\ufeff\u200c\u200d\u200d\u200c\u200c\u200d\ufeff\u200d\u200c\ufeff\u200c\u200b\u200c\u200d\u200c\u200c\u200c\u200d\ufeff\u200d\u200c\ufeff\u200c\u200b\u200b\u200d\ufeff\ufeff\u200c\u200d\u200c\u200c\u200c\u200d\u200c\u200b\u200c\u200d\u200d\u200c\u200c\ufeff\u200c\u200b\u200b\u200d\ufeff\ufeff\u200c\u200d\u200d\u200c\u200c\u200d\u200c\u200b\u200b\ufeff\ufeff\u200c\u200c\ufeff\u200d\u200b\u200b\u200d\u200b\u200d\u200c\ufeff\ufeff\u200c';

describe('section helpers are stega-safe (draft mode)', () => {
    it('fixture really is encoded', () => {
        assert.notEqual(withStega('page'), 'page');
    });

    it('inherits for an encoded "page" source (was: section vanished)', () => {
        assert.equal(shouldInheritSectionList(withStega('page'), []), true);
        assert.equal(shouldInheritSectionList(withStega('custom'), []), false);
    });

    it('reads encoded align / padding enums', () => {
        assert.equal(mapSectionAlign(withStega('center')), 'center');
        assert.equal(mapSectionPaddingBlock(withStega('lg')), 'lg');
    });

    it('replaces leftover FAQs when an encoded page source is set', () => {
        const [section] = applyFaqInherit(
            [
                {
                    _key: 'faq',
                    _type: 'faqSection',
                    listSource: withStega('page'),
                    faqs: [
                        {
                            question: 'Stale template question',
                            answerPlain: 'Stale answer.',
                        },
                    ],
                } as PageSectionDoc,
            ],
            [{question: 'Page question', answerPlain: 'Page answer.'}],
        ) as unknown as [{faqs?: {question?: string}[]}];
        assert.deepEqual(
            section.faqs?.map((faq) => faq.question),
            ['Page question'],
        );
    });
});
