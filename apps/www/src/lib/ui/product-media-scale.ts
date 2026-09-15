/**
 * Resting product/media inset scale (hover settle goes to 1).
 * Single source of truth for the digit used across catalog, PDP, and request cards.
 */
export const PRODUCT_MEDIA_SCALE = 0.98;

/**
 * Tailwind classes must be full string literals for JIT.
 * Digit in these strings must match PRODUCT_MEDIA_SCALE.
 */
export const productMediaRestClass = 'origin-center scale-[0.98]';

export const productMediaHoverClass =
    'transition-[scale] duration-300 ease-out group-hover:scale-100 motion-reduce:transition-none motion-reduce:group-hover:scale-[0.98]';

/** On the `group` element itself (e.g. MediaTileCard whole-tile settle). */
export const productMediaSelfHoverClass =
    'transition-[scale,background-color] duration-[var(--motion-slow)] ease-in-out hover:scale-100 focus-within:scale-100 motion-reduce:transition-none motion-reduce:hover:scale-[0.98] motion-reduce:focus-within:scale-[0.98]';

export const productMediaLayerClass = `absolute inset-0 ${productMediaRestClass}`;
