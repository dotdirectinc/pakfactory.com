'use client';

import {useEffect, useRef} from 'react';

/** Visitor input that means "still here". Scroll is captured so inner scroll areas count too. */
const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/** How often the timer checks. A short check is cheap and keeps the prompt close to `idleMs`. */
const CHECK_MS = 1000;

/**
 * Calls `onIdle` once when the visitor gives no input for `idleMs` while the tab is visible.
 * Input resets the clock; a hidden tab resets it too, so a visitor who comes back is not prompted
 * at once. `resetKey` (e.g. the path) restarts the clock and allows one more call.
 */
export function useIdle(idleMs: number, enabled: boolean, onIdle: () => void, resetKey?: string): void {
    const onIdleRef = useRef(onIdle);
    onIdleRef.current = onIdle;

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;
        let last = Date.now();
        let fired = false;
        const mark = () => {
            last = Date.now();
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') mark();
        };
        for (const name of ACTIVITY_EVENTS) window.addEventListener(name, mark, {capture: true, passive: true});
        document.addEventListener('visibilitychange', onVisibility);
        const timer = window.setInterval(() => {
            if (fired || document.visibilityState !== 'visible') return;
            if (Date.now() - last < idleMs) return;
            fired = true;
            onIdleRef.current();
        }, CHECK_MS);
        return () => {
            window.clearInterval(timer);
            for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, mark, {capture: true});
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [idleMs, enabled, resetKey]);
}
