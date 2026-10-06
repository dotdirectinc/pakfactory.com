'use client';

import {useLayoutEffect} from 'react';
import {useSearchParams} from 'next/navigation';

type SearchParamsListenerProps = {
    onChange: (searchParams: URLSearchParams) => void;
};

/**
 * Reports the URL's search params to a catalog panel (PROD-2799).
 *
 * `useSearchParams` on a static page bails the nearest Suspense boundary out of
 * server rendering. Isolating it in this null-rendering component, under its own
 * `<Suspense fallback={null}>`, keeps the bailout to *this* boundary, so the
 * catalog grid itself is server-rendered (default, unfiltered view) and URL
 * filters apply right after hydration. Layout effect: on client-side mounts
 * (navigating in from another page) the filters apply before first paint.
 */
export function SearchParamsListener({onChange}: SearchParamsListenerProps) {
    const searchParams = useSearchParams();
    useLayoutEffect(() => {
        onChange(new URLSearchParams(searchParams.toString()));
    }, [searchParams, onChange]);
    return null;
}
