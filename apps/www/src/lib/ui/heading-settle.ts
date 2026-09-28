import type {CSSProperties} from 'react';

/** Stagger step between heading-settle siblings (Apple-like cascade). */
export const HEADING_SETTLE_STAGGER_MS = 100;

/**
 * Apple Mac–style settle classes (opacity + 30px rise over `--motion-reveal`).
 * Pair with {@link headingSettleStyle} for stagger. Skipped under
 * `prefers-reduced-motion` via CSS + `motion-reduce:animate-none`.
 */
export function headingSettleClassName(enabled = true): string | undefined {
    if (!enabled) return undefined;
    return 'animate-heading-settle motion-reduce:animate-none';
}

/** CSS `--settle-delay` for the Nth settle step (0-based). */
export function headingSettleStyle(step = 0): CSSProperties | undefined {
    if (step <= 0) return undefined;
    return {
        '--settle-delay': `${step * HEADING_SETTLE_STAGGER_MS}ms`,
    } as CSSProperties;
}

/** Convenience for elements outside {@link PageHeadingContent}. */
export function headingSettleProps(step = 0, enabled = true) {
    if (!enabled) return {};
    return {
        className: headingSettleClassName(true),
        style: headingSettleStyle(step),
    };
}
