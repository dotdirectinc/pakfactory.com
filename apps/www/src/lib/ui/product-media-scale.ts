/**
 * Resting product/media inset scale (hover settle goes to 1).
 * Single source of truth for the digit used across catalog, PDP, and request cards.
 */
export const PRODUCT_MEDIA_SCALE = 0.98;

/**
 * Tailwind classes must be full string literals for JIT.
 * Digit in these strings must match PRODUCT_MEDIA_SCALE.
 * Uses composed `transform: translateZ(0) scale(...)` so GPU promotion
 * does not fight the settle scale.
 */
export const productMediaRestClass =
    'origin-center backface-hidden [transform:translateZ(0)_scale(0.98)]';

export const productMediaHoverClass =
    'transition-transform duration-300 ease-out group-hover:[transform:translateZ(0)_scale(1)] motion-reduce:transition-none motion-reduce:group-hover:[transform:translateZ(0)_scale(0.98)]';

/** On the `group` element itself (e.g. MediaTileCard whole-tile settle). */
export const productMediaSelfHoverClass =
    'transition-[transform,background-color] duration-[var(--motion-slow)] ease-in-out hover:[transform:translateZ(0)_scale(1)] focus-within:[transform:translateZ(0)_scale(1)] motion-reduce:transition-none motion-reduce:hover:[transform:translateZ(0)_scale(0.98)] motion-reduce:focus-within:[transform:translateZ(0)_scale(0.98)]';

export const productMediaLayerClass = `absolute inset-0 ${productMediaRestClass}`;
