'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';

import {useCatalogSearchDraft} from '@/lib/catalog/use-catalog-search-draft';

const PARAM_Q = 'q';
/** Legacy load-more depth param — stripped on URL writes, never read. */
const LEGACY_PARAM_VISIBLE = 'visible';

export type CatalogExtraParamDef = {
    /** Query-string key (e.g. `category`). */
    param: string;
    /** Value written as "absent" (e.g. `all`). */
    defaultValue: string;
};

export type UseCatalogQueryStateOptions = {
    /** When false, state is local-only (section embeds). */
    urlSync?: boolean;
    /** Facet ids that may appear in the URL. */
    facetIds: Iterable<string>;
    /**
     * Extra URL params (e.g. customizations `category`).
     * Keys are stable ids used in `extras` / `setExtra`.
     */
    extraParams?: Record<string, CatalogExtraParamDef>;
    /** Seed for extras when `urlSync` is false or the URL omits the param. */
    initialExtras?: Record<string, string>;
};

export type CatalogQueryState = {
    query: string;
    draftQuery: string;
    setDraftQuery: (q: string) => void;
    selections: Record<string, string[]>;
    extras: Record<string, string>;
    setExtra: (key: string, value: string) => void;
    toggleFacet: (facetId: string, value: string) => void;
    setSelections: (
        next: Record<string, string[]>,
        options?: {
            clearFacetIds?: string[];
            clearQuery?: boolean;
            extras?: Record<string, string>;
        },
    ) => void;
    reset: (options?: {
        clearExtrasToDefault?: boolean;
        clearQuery?: boolean;
    }) => void;
    /** Call when filters change so progressive reveal resets. */
    onFilterCommit?: () => void;
};

function parseList(raw: string | null): string[] {
    if (!raw?.trim()) return [];
    return raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
}

function serializeList(values: string[]): string | null {
    return values.length > 0 ? values.join(',') : null;
}

function toggleValue(list: string[], value: string): string[] {
    return list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value];
}

function readSelectionsFromParams(
    searchParams: URLSearchParams,
    facetIds: Iterable<string>,
): Record<string, string[]> {
    const next: Record<string, string[]> = {};
    for (const id of facetIds) {
        const values = parseList(searchParams.get(id));
        if (values.length) next[id] = values;
    }
    return next;
}

function readExtrasFromParams(
    searchParams: URLSearchParams,
    extraParams: Record<string, CatalogExtraParamDef> | undefined,
    initialExtras: Record<string, string> | undefined,
): Record<string, string> {
    const next: Record<string, string> = {};
    if (!extraParams) return next;
    for (const [key, def] of Object.entries(extraParams)) {
        const fromUrl = searchParams.get(def.param)?.trim();
        if (fromUrl) {
            next[key] = fromUrl;
            continue;
        }
        const initial = initialExtras?.[key]?.trim();
        next[key] = initial || def.defaultValue;
    }
    return next;
}

function extrasEqual(
    a: Record<string, string>,
    b: Record<string, string>,
): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
        if ((a[key] ?? '') !== (b[key] ?? '')) return false;
    }
    return true;
}

function selectionsEqual(
    a: Record<string, string[]>,
    b: Record<string, string[]>,
): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
        const left = a[key] ?? [];
        const right = b[key] ?? [];
        if (left.length !== right.length) return false;
        if (left.some((value, index) => value !== right[index])) return false;
    }
    return true;
}

/**
 * Catalog filter state with optional URL mirroring via `history.replaceState`
 * (no server round trip). Back/forward re-seeds from `useSearchParams`.
 */
export function useCatalogQueryState({
    urlSync = true,
    facetIds,
    extraParams,
    initialExtras,
}: UseCatalogQueryStateOptions): CatalogQueryState {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const facetIdList = useMemo(() => [...new Set(facetIds)], [facetIds]);
    const facetIdKey = facetIdList.join('\0');

    const [query, setQuery] = useState(() =>
        urlSync ? (searchParams.get(PARAM_Q) ?? '') : '',
    );
    const [selections, setSelectionsState] = useState<Record<string, string[]>>(
        () =>
            urlSync
                ? readSelectionsFromParams(searchParams, facetIdList)
                : {},
    );
    const [extras, setExtrasState] = useState<Record<string, string>>(() =>
        readExtrasFromParams(
            urlSync ? searchParams : new URLSearchParams(),
            extraParams,
            initialExtras,
        ),
    );

    const writingRef = useRef(false);

    const mirrorUrl = useCallback(
        (
            nextQuery: string,
            nextSelections: Record<string, string[]>,
            nextExtras: Record<string, string>,
        ) => {
            if (!urlSync || typeof window === 'undefined') return;

            const params = new URLSearchParams(window.location.search);
            params.delete(LEGACY_PARAM_VISIBLE);

            if (!nextQuery.trim()) params.delete(PARAM_Q);
            else params.set(PARAM_Q, nextQuery);

            if (extraParams) {
                for (const [key, def] of Object.entries(extraParams)) {
                    const value = nextExtras[key] ?? def.defaultValue;
                    if (!value || value === def.defaultValue) {
                        params.delete(def.param);
                    } else {
                        params.set(def.param, value);
                    }
                }
            }

            for (const id of facetIdList) {
                params.delete(id);
            }
            for (const [id, values] of Object.entries(nextSelections)) {
                const serialized = serializeList(values);
                if (serialized) params.set(id, serialized);
            }

            const qs = params.toString();
            const nextUrl = qs ? `${pathname}?${qs}` : pathname;
            const currentUrl = `${window.location.pathname}${window.location.search}`;
            if (nextUrl === currentUrl) return;

            writingRef.current = true;
            window.history.replaceState(window.history.state, '', nextUrl);
            // Next keeps useSearchParams in sync; clear the flag on the next tick.
            queueMicrotask(() => {
                writingRef.current = false;
            });
        },
        [urlSync, pathname, facetIdList, extraParams],
    );

    // Back / forward (and any external searchParams change we did not write).
    useEffect(() => {
        if (!urlSync) return;
        if (writingRef.current) return;

        const nextQuery = searchParams.get(PARAM_Q) ?? '';
        const nextSelections = readSelectionsFromParams(
            searchParams,
            facetIdList,
        );
        const nextExtras = readExtrasFromParams(
            searchParams,
            extraParams,
            initialExtras,
        );

        setQuery((prev) => (prev === nextQuery ? prev : nextQuery));
        setSelectionsState((prev) =>
            selectionsEqual(prev, nextSelections) ? prev : nextSelections,
        );
        setExtrasState((prev) =>
            extrasEqual(prev, nextExtras) ? prev : nextExtras,
        );
        // facetIdKey tracks facetIdList identity for the dependency array.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- facetIdKey stands in for facetIdList
    }, [urlSync, searchParams, facetIdKey, extraParams, initialExtras]);

    const commitSearch = useCallback(
        (q: string) => {
            setQuery(q);
            mirrorUrl(q, selections, extras);
        },
        [mirrorUrl, selections, extras],
    );

    const {draftQuery, setDraftQuery} = useCatalogSearchDraft({
        committedQuery: query,
        onCommit: commitSearch,
    });

    const setSelections = useCallback(
        (
            next: Record<string, string[]>,
            options?: {
                clearFacetIds?: string[];
                clearQuery?: boolean;
                extras?: Record<string, string>;
            },
        ) => {
            const cleaned: Record<string, string[]> = {};
            for (const [id, values] of Object.entries(next)) {
                if (values.length > 0) cleaned[id] = values;
            }
            const nextQuery = options?.clearQuery ? '' : query;
            const nextExtras = options?.extras ?? extras;
            if (options?.clearQuery) setDraftQuery('');
            setQuery(nextQuery);
            setSelectionsState(cleaned);
            if (options?.extras) setExtrasState(nextExtras);
            mirrorUrl(nextQuery, cleaned, nextExtras);
        },
        [query, extras, mirrorUrl, setDraftQuery],
    );

    const toggleFacet = useCallback(
        (facetId: string, value: string) => {
            const next = {
                ...selections,
                [facetId]: toggleValue(selections[facetId] ?? [], value),
            };
            if (next[facetId]?.length === 0) delete next[facetId];
            setDraftQuery('');
            setQuery('');
            setSelectionsState(next);
            mirrorUrl('', next, extras);
        },
        [selections, extras, mirrorUrl, setDraftQuery],
    );

    const setExtra = useCallback(
        (key: string, value: string) => {
            const nextExtras = {...extras, [key]: value};
            setExtrasState(nextExtras);
            mirrorUrl(query, selections, nextExtras);
        },
        [extras, query, selections, mirrorUrl],
    );

    const reset = useCallback(
        (options?: {
            clearExtrasToDefault?: boolean;
            clearQuery?: boolean;
        }) => {
            const nextQuery = options?.clearQuery === false ? query : '';
            const nextSelections: Record<string, string[]> = {};
            let nextExtras = extras;
            if (options?.clearExtrasToDefault !== false && extraParams) {
                nextExtras = {};
                for (const [key, def] of Object.entries(extraParams)) {
                    nextExtras[key] = def.defaultValue;
                }
            }
            setDraftQuery('');
            setQuery(nextQuery);
            setSelectionsState(nextSelections);
            setExtrasState(nextExtras);
            mirrorUrl(nextQuery, nextSelections, nextExtras);
        },
        [query, extras, extraParams, mirrorUrl, setDraftQuery],
    );

    return {
        query,
        draftQuery,
        setDraftQuery,
        selections,
        extras,
        setExtra,
        toggleFacet,
        setSelections,
        reset,
    };
}
