'use client';

import {useEffect, useRef, useState, type RefObject} from 'react';

/** Scroll spent on the reveal, over and above the pinned viewport. */
export const SCRUB_VH = 100;

const disabled = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(max-width: 639px)').matches;

/**
 * Pinned scroll-scrub engine (POC `useHeroScrub` parity): reserve
 * `100vh + SCRUB_VH` of page height, pin a viewport-tall window inside it, and
 * call `paint(t, hostRect)` with progress 0 → 1 on every (rAF-throttled) scroll
 * frame — and `paint(1)` on teardown ("put it at rest"). `paint` writes to the
 * DOM directly; re-rendering on every frame would blow the frame budget.
 *
 * Off under reduced motion and below 640px (live media queries): `active` is
 * false, no runway is reserved and `landed` is true straight away.
 */
export function useScrollScrub({
    runwayRef,
    windowRef,
    enabled,
    paint,
}: {
    runwayRef: RefObject<HTMLElement | null>;
    windowRef: RefObject<HTMLElement | null>;
    enabled: boolean;
    paint: (t: number, host: DOMRect) => void;
}): {landed: boolean; active: boolean} {
    // SSR-safe initial state: inactive until the client has checked the gates.
    const [active, setActive] = useState(false);
    const [landed, setLanded] = useState(true);
    const paintRef = useRef(paint);
    paintRef.current = paint;

    useEffect(() => {
        if (!enabled) return undefined;
        const sync = () => setActive(!disabled());
        sync();
        const queries = [
            window.matchMedia('(prefers-reduced-motion: reduce)'),
            window.matchMedia('(max-width: 639px)'),
        ];
        queries.forEach((q) => q.addEventListener('change', sync));
        return () => queries.forEach((q) => q.removeEventListener('change', sync));
    }, [enabled]);

    useEffect(() => {
        if (!active) {
            setLanded(true);
            return undefined;
        }
        const runway = runwayRef.current;
        const host = windowRef.current;
        if (!runway || !host) return undefined;

        let frame = 0;
        const draw = () => {
            frame = 0;
            const scrub = window.innerHeight * (SCRUB_VH / 100);
            const t = Math.min(1, Math.max(0, -runway.getBoundingClientRect().top / scrub));
            setLanded(t >= 1);
            paintRef.current(t, host.getBoundingClientRect());
        };
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(draw);
        };
        draw();
        window.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('resize', onScroll);
        return () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            paintRef.current(1, host.getBoundingClientRect());
        };
    }, [active, runwayRef, windowRef]);

    return {landed, active};
}
