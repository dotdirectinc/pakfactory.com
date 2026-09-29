'use client';

import {useEffect, useState} from 'react';

const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the user prefers reduced motion (`prefers-reduced-motion: reduce`).
 * SSR-safe: starts `false`, then syncs after mount.
 */
export function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia(REDUCE_MOTION_QUERY);
        const sync = () => setReduced(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    return reduced;
}
