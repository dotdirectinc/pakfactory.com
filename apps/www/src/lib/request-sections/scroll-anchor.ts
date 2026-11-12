/** Request top bar height (RequestTopBar h-[68px]). */
export const REQUEST_SHELL_CHROME_PX = 68;
/** Gap under the sticky top bar so the step heading isn’t tight on the border. */
export const REQUEST_SHELL_CHROME_GAP_PX = 8;

/**
 * While a step folds/opens, ease the target header from its click position up to the
 * chrome stop — one continuous “follow up and open” motion (proto A → live request).
 * Returns a cancel function for effect cleanup.
 */
export function anchorHeaderToWorkBand(
    elementId: string,
    durationMs: number,
): () => void {
    const el = document.getElementById(elementId);
    if (!el) return () => {};

    const targetY = REQUEST_SHELL_CHROME_PX + REQUEST_SHELL_CHROME_GAP_PX;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
        const top = el.getBoundingClientRect().top + window.scrollY - targetY;
        window.scrollTo({top: Math.max(0, top), behavior: 'auto'});
        return () => {};
    }

    const startY = el.getBoundingClientRect().top;
    const start = performance.now();
    let raf = 0;
    let cancelled = false;

    const frame = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / durationMs);
        // Ease-out cubic — matches section fold feel.
        const eased = 1 - (1 - t) ** 3;
        const desiredY = startY + (targetY - startY) * eased;
        const currentY = el.getBoundingClientRect().top;
        const delta = currentY - desiredY;
        if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
        if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
    };
}
