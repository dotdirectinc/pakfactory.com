import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {resolveOverviewChrome} from './overview-chrome';

describe('resolveOverviewChrome', () => {
    it('treats unset CTA, Bookmark, and configuration as today’s rail', () => {
        assert.deepEqual(resolveOverviewChrome(undefined), {
            showCta: true,
            showBookmark: true,
            configurationSource: 'properties',
        });
        assert.deepEqual(resolveOverviewChrome({}), {
            showCta: true,
            showBookmark: true,
            configurationSource: 'properties',
        });
    });

    it('honors explicit false CTA and Bookmark', () => {
        assert.deepEqual(
            resolveOverviewChrome({showCta: false, showBookmark: false}),
            {
                showCta: false,
                showBookmark: false,
                configurationSource: 'properties',
            },
        );
    });

    it('reads achieves and none; unknown falls back to properties', () => {
        assert.equal(
            resolveOverviewChrome({configurationSource: 'achieves'})
                .configurationSource,
            'achieves',
        );
        assert.equal(
            resolveOverviewChrome({configurationSource: 'none'})
                .configurationSource,
            'none',
        );
        assert.equal(
            resolveOverviewChrome({configurationSource: 'properties'})
                .configurationSource,
            'properties',
        );
        assert.equal(
            resolveOverviewChrome({configurationSource: 'both'})
                .configurationSource,
            'properties',
        );
    });
});
