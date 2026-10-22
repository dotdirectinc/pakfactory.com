import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    LIGHTBOX_SWIPE_FLICK_PX_PER_MS,
    lightboxSlotIndex,
    lightboxSlotIsBright,
    lightboxStepTarget,
    lightboxSwipeIntent,
    lightboxTrack,
} from './lightbox-track';

describe('lightboxSlotIndex', () => {
    it('returns only the center slot for one image', () => {
        assert.equal(lightboxSlotIndex(1, 0, 0), 0);
        assert.equal(lightboxSlotIndex(1, 0, -1), null);
        assert.equal(lightboxSlotIndex(1, 0, 1), null);
        assert.equal(lightboxSlotIndex(1, 0, -2), null);
        assert.equal(lightboxSlotIndex(1, 0, 2), null);
    });

    it('parks the other image on the right of the first of two', () => {
        assert.equal(lightboxSlotIndex(2, 0, -2), null);
        assert.equal(lightboxSlotIndex(2, 0, -1), null);
        assert.equal(lightboxSlotIndex(2, 0, 0), 0);
        assert.equal(lightboxSlotIndex(2, 0, 1), 1);
        assert.equal(lightboxSlotIndex(2, 0, 2), null);
    });

    it('parks the other image on the left of the second of two', () => {
        assert.equal(lightboxSlotIndex(2, 1, -2), null);
        assert.equal(lightboxSlotIndex(2, 1, -1), 0);
        assert.equal(lightboxSlotIndex(2, 1, 0), 1);
        assert.equal(lightboxSlotIndex(2, 1, 1), null);
        assert.equal(lightboxSlotIndex(2, 1, 2), null);
    });

    it('wraps both directions when there are three or more', () => {
        assert.equal(lightboxSlotIndex(3, 0, -1), 2);
        assert.equal(lightboxSlotIndex(3, 0, 1), 1);
        assert.equal(lightboxSlotIndex(3, 0, -2), 1);
        assert.equal(lightboxSlotIndex(3, 0, 2), 2);
        assert.equal(lightboxSlotIndex(4, 0, -1), 3);
        assert.equal(lightboxSlotIndex(4, 3, 1), 0);
    });
});

describe('lightboxTrack', () => {
    it('builds five slots for a wrapping gallery', () => {
        assert.deepEqual(
            lightboxTrack(3, 0).map((slot) => slot.index),
            [1, 2, 0, 1, 2],
        );
    });
});

describe('lightboxSlotIsBright', () => {
    it('keeps the pending photo bright during a slide', () => {
        assert.equal(lightboxSlotIsBright(1, 0, 1), true);
        assert.equal(lightboxSlotIsBright(0, 0, 1), false);
        assert.equal(lightboxSlotIsBright(2, 0, 1), false);
    });

    it('uses the active photo at rest', () => {
        assert.equal(lightboxSlotIsBright(0, 0, null), true);
        assert.equal(lightboxSlotIsBright(1, 0, null), false);
        assert.equal(lightboxSlotIsBright(2, 2, null), true);
    });

    it('never treats an empty slot as bright', () => {
        assert.equal(lightboxSlotIsBright(null, 0, null), false);
        assert.equal(lightboxSlotIsBright(null, 0, 1), false);
    });
});

describe('lightboxStepTarget', () => {
    it('blocks the empty side of a two-image gallery', () => {
        assert.equal(lightboxStepTarget(2, 0, -1), null);
        assert.equal(lightboxStepTarget(2, 0, 1), 1);
        assert.equal(lightboxStepTarget(2, 1, -1), 0);
        assert.equal(lightboxStepTarget(2, 1, 1), null);
    });

    it('wraps a three-image gallery', () => {
        assert.equal(lightboxStepTarget(3, 0, -1), 2);
        assert.equal(lightboxStepTarget(3, 2, 1), 0);
    });
});

describe('lightboxSwipeIntent', () => {
    it('commits next when travel exceeds 20% of the step', () => {
        assert.equal(lightboxSwipeIntent(-81, 400, 0), 1);
        assert.equal(lightboxSwipeIntent(81, 400, 0), -1);
    });

    it('ignores a short drag without a flick', () => {
        assert.equal(lightboxSwipeIntent(-79, 400, 0), 0);
        assert.equal(lightboxSwipeIntent(0, 400, 0), 0);
        assert.equal(lightboxSwipeIntent(-40, 0, -1), 0);
    });

    it('commits a short flick from velocity', () => {
        assert.equal(
            lightboxSwipeIntent(-10, 400, -LIGHTBOX_SWIPE_FLICK_PX_PER_MS),
            1,
        );
        assert.equal(
            lightboxSwipeIntent(10, 400, LIGHTBOX_SWIPE_FLICK_PX_PER_MS),
            -1,
        );
    });
});
