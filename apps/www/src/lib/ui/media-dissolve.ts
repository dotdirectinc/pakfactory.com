/**
 * Shared media dissolve / crossfade (rest ↔ hover, poster ↔ video).
 * Single source for duration + easing — keep in sync with `--motion-slow`.
 * Tailwind classes must be full string literals for JIT.
 */

/** Matches `--motion-slow` — JS timers (e.g. pause after fade) stay in sync. */
export const MEDIA_DISSOLVE_MS = 500;

/** Shared opacity dissolve transition (rest ↔ hover layers). */
export const mediaDissolveTransitionClass =
    'transition-opacity duration-(--motion-slow) ease-in-out motion-reduce:transition-none';

/**
 * Rest / poster layer: visible at rest; fades out under group hover/focus
 * when a hover sibling exists. Compose with {@link mediaDissolveTransitionClass}
 * only when needed for video-driven opacity without group-hover.
 */
export const mediaDissolveRestHoverOutClass =
    'transition-opacity duration-(--motion-slow) ease-in-out motion-reduce:transition-none sm:group-hover:opacity-0 sm:group-focus-within:opacity-0';

/** Hover still layer: hidden at rest; fades in under group hover/focus. */
export const mediaDissolveHoverInClass =
    'transition-opacity duration-(--motion-slow) ease-in-out motion-reduce:transition-none opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100';
