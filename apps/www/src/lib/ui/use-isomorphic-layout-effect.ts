import {useEffect, useLayoutEffect} from 'react';

/**
 * `useLayoutEffect` on the client (measure before paint — no flash of the
 * wrong animation state), `useEffect` on the server where there is no layout.
 */
export const useIsomorphicLayoutEffect =
    typeof window !== 'undefined' ? useLayoutEffect : useEffect;
