import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {resolveStyleFaqs} from './faq-inheritance';

const lineFaqs = [
    {question: 'What is tin packaging?', answerPlain: 'Tin packaging is…'},
    {question: 'Are your tin boxes food safe?', answerPlain: 'Yes…'},
];

describe('resolveStyleFaqs', () => {
    it("falls back to the line's FAQs when the style has none", () => {
        assert.deepEqual(resolveStyleFaqs({}, {faqs: lineFaqs}), lineFaqs);
        assert.deepEqual(resolveStyleFaqs({faqs: []}, {faqs: lineFaqs}), lineFaqs);
    });

    it("uses the style's own FAQs outright, even just one — nothing merges", () => {
        const own = [{question: 'Can hinged tins be embossed?', answerPlain: 'Yes…'}];
        assert.deepEqual(resolveStyleFaqs({faqs: own}, {faqs: lineFaqs}), own);
    });

    it('is empty when neither level has FAQs', () => {
        assert.deepEqual(resolveStyleFaqs({}, {}), []);
    });
});
