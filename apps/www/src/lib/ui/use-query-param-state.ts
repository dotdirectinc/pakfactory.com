'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';

export type QueryParamDef = {
    /** Query-string key (e.g. `line`). */
    param: string;
    /** Value treated as absent — omitted from the URL when selected. */
    defaultValue: string;
};

export type UseQueryParamStateOptions = {
    /**
     * Named string params to mirror. Keys are stable ids used in `values` /
     * `setValue` (not necessarily the query-string key).
     */
    params: Record<string, QueryParamDef>;
    /** When false, state is local-only. Default true. */
    urlSync?: boolean;
};

export type QueryParamState = {
    values: Record<string, string>;
    setValue: (key: string, value: string) => void;
    setValues: (next: Record<string, string>) => void;
};

function readValues(
    searchParams: URLSearchParams,
    params: Record<string, QueryParamDef>,
): Record<string, string> {
    const next: Record<string, string> = {};
    for (const [key, def] of Object.entries(params)) {
        const fromUrl = searchParams.get(def.param)?.trim();
        next[key] = fromUrl || def.defaultValue;
    }
    return next;
}

/**
 * Thin URL mirror for a few string params via `history.replaceState` (no RSC
 * round trip). Back/forward re-seeds from `useSearchParams`. Defaults are
 * stripped from the URL so the bare path stays clean.
 *
 * Catalog facets use the heavier `useCatalogQueryState`; prefer this for
 * pickers, deep links, and other simple key/value bands.
 */
export function useQueryParamState({
    params,
    urlSync = true,
}: UseQueryParamStateOptions): QueryParamState {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const writingRef = useRef(false);
    const paramsRef = useRef(params);
    paramsRef.current = params;

    const [values, setValuesState] = useState(() =>
        urlSync
            ? readValues(searchParams, params)
            : Object.fromEntries(
                  Object.entries(params).map(([key, def]) => [
                      key,
                      def.defaultValue,
                  ]),
              ),
    );

    const mirrorUrl = useCallback(
        (next: Record<string, string>) => {
            if (!urlSync || typeof window === 'undefined') return;

            const defs = paramsRef.current;
            const urlParams = new URLSearchParams(window.location.search);
            for (const [key, def] of Object.entries(defs)) {
                const value = next[key] ?? def.defaultValue;
                if (!value || value === def.defaultValue) {
                    urlParams.delete(def.param);
                } else {
                    urlParams.set(def.param, value);
                }
            }

            const qs = urlParams.toString();
            const nextUrl = qs ? `${pathname}?${qs}` : pathname;
            const currentUrl = `${window.location.pathname}${window.location.search}`;
            if (nextUrl === currentUrl) return;

            writingRef.current = true;
            window.history.replaceState(window.history.state, '', nextUrl);
            queueMicrotask(() => {
                writingRef.current = false;
            });
        },
        [urlSync, pathname],
    );

    // Back / forward (and any external searchParams change we did not write).
    useEffect(() => {
        if (!urlSync) return;
        if (writingRef.current) return;
        setValuesState(readValues(searchParams, paramsRef.current));
    }, [urlSync, searchParams]);

    const setValues = useCallback(
        (partial: Record<string, string>) => {
            setValuesState((prev) => {
                const next = {...prev, ...partial};
                mirrorUrl(next);
                return next;
            });
        },
        [mirrorUrl],
    );

    const setValue = useCallback(
        (key: string, value: string) => {
            setValues({[key]: value});
        },
        [setValues],
    );

    return {values, setValue, setValues};
}
