import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {mergeFeaturedThenFill} from './merge-featured-then-fill';

describe('mergeFeaturedThenFill', () => {
    const key = (item: {slug: string}) => item.slug;

    it('returns auto only when featured is empty', () => {
        const auto = [{slug: 'a'}, {slug: 'b'}];
        assert.deepEqual(mergeFeaturedThenFill([], auto, key), auto);
    });

    it('puts featured first and fills from auto without duplicates', () => {
        const featured = [{slug: 'pin-1'}, {slug: 'pin-2'}];
        const auto = [{slug: 'pin-1'}, {slug: 'auto-1'}, {slug: 'auto-2'}];
        assert.deepEqual(mergeFeaturedThenFill(featured, auto, key), [
            {slug: 'pin-1'},
            {slug: 'pin-2'},
            {slug: 'auto-1'},
            {slug: 'auto-2'},
        ]);
    });

    it('respects cap after featured + fill', () => {
        const featured = [{slug: 'a'}, {slug: 'b'}];
        const auto = [{slug: 'c'}, {slug: 'd'}, {slug: 'e'}];
        assert.deepEqual(mergeFeaturedThenFill(featured, auto, key, 3), [
            {slug: 'a'},
            {slug: 'b'},
            {slug: 'c'},
        ]);
    });

    it('caps within featured when featured alone exceeds cap', () => {
        const featured = [{slug: 'a'}, {slug: 'b'}, {slug: 'c'}];
        assert.deepEqual(mergeFeaturedThenFill(featured, [{slug: 'd'}], key, 2), [
            {slug: 'a'},
            {slug: 'b'},
        ]);
    });
});
