/** Offsets for the five-slot lightbox track: two left, active, two right. */
export const LIGHTBOX_TRACK_OFFSETS = [-2, -1, 0, 1, 2] as const;

export type LightboxTrackOffset = (typeof LIGHTBOX_TRACK_OFFSETS)[number];

export type LightboxSlot = {
    offset: LightboxTrackOffset;
    index: number | null;
};

/**
 * Image index for a track slot, or `null` when that side is empty.
 *
 * - 1 image: only the center slot.
 * - 2 images: the other image sits on the right of the first, then on the
 *   left of the second (no wrap, no duplicate).
 * - 3+ images: wrap in both directions, including ±2 so a slide can keep a
 *   neighbor in the gutter.
 */
export function lightboxSlotIndex(
    count: number,
    activeIndex: number,
    offset: number,
): number | null {
    if (count <= 0) return null;
    const index = ((activeIndex % count) + count) % count;
    if (count === 1) return offset === 0 ? index : null;
    if (count === 2) {
        if (offset === 0) return index;
        if (offset === 1 && index === 0) return 1;
        if (offset === -1 && index === 1) return 0;
        return null;
    }
    return (index + offset + count * 3) % count;
}

export function lightboxTrack(
    count: number,
    activeIndex: number,
): LightboxSlot[] {
    return LIGHTBOX_TRACK_OFFSETS.map((offset) => ({
        offset,
        index: lightboxSlotIndex(count, activeIndex, offset),
    }));
}

/** Immediate neighbor for a step, or `null` when that side is empty. */
export function lightboxStepTarget(
    count: number,
    activeIndex: number,
    direction: -1 | 1,
): number | null {
    return lightboxSlotIndex(count, activeIndex, direction);
}

/**
 * Slot dim: the pending (incoming) photo stays at 100% through a slide;
 * at rest the active photo is bright.
 */
export function lightboxSlotIsBright(
    slotIndex: number | null,
    activeIndex: number,
    pendingIndex: number | null,
): boolean {
    if (slotIndex == null) return false;
    return slotIndex === (pendingIndex ?? activeIndex);
}

/** Commit when the finger travels at least 20% of one card step. */
export const LIGHTBOX_SWIPE_DISTANCE_RATIO = 0.2;

/** Flick commit — 0.5px/ms ≈ 500px/s. */
export const LIGHTBOX_SWIPE_FLICK_PX_PER_MS = 0.5;

/**
 * Swipe → step direction. Finger right (`dx > 0`) reveals the previous
 * image (`-1`); finger left reveals next (`1`). Empty sides are gated by
 * {@link lightboxStepTarget} in the UI, not here.
 */
export function lightboxSwipeIntent(
    dx: number,
    step: number,
    velocityX: number,
): -1 | 0 | 1 {
    if (!Number.isFinite(dx) || !Number.isFinite(step) || step <= 0) {
        return 0;
    }
    const fromDistance: -1 | 0 | 1 =
        dx === 0 ? 0 : dx > 0 ? -1 : 1;
    if (Math.abs(dx) > step * LIGHTBOX_SWIPE_DISTANCE_RATIO) {
        return fromDistance;
    }
    if (
        !Number.isFinite(velocityX) ||
        Math.abs(velocityX) < LIGHTBOX_SWIPE_FLICK_PX_PER_MS
    ) {
        return 0;
    }
    return velocityX > 0 ? -1 : 1;
}
