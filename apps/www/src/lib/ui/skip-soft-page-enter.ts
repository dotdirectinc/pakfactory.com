/**
 * One-shot flag: leaving a chrome-less tool shell (`(request)` / `(compare)`)
 * should skip the next `(site)` SoftPageTransition enter so the sticky nav
 * does not appear to jump under an 8px content rise. See DESIGN.md § Motion.
 */

const STORAGE_KEY = 'www:skip-soft-page-enter';

export function markSkipSoftPageEnter(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
        // Private mode / quota — enter animation may still play.
    }
}

/** Read and clear. True = skip `animate-page-enter` on this SoftPageTransition mount. */
export function consumeSkipSoftPageEnter(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const skip = sessionStorage.getItem(STORAGE_KEY) === '1';
        if (skip) sessionStorage.removeItem(STORAGE_KEY);
        return skip;
    } catch {
        return false;
    }
}
