'use client';

import {useEffect, useRef, useState} from 'react';

import {captureEvent} from '@/lib/analytics';

import {
    MIN_QUERY_LENGTH,
    normalizeQuery,
    type SearchMatch,
    type SearchResponse,
} from './search-query';

/**
 * Debounced `/api/search` for the ⌘K dialog (PROD-3111).
 *
 * - waits 250 ms after typing stops; under 2 characters makes no request
 * - sends the normalized query, so equivalent typing shares one CDN entry
 * - aborts the in-flight request when the query changes
 * - a 429 becomes `rate-limited` (the dialog keeps browse content visible)
 * - `match: 'loose'` (Basic mode) lets Algolia drop words when all of them
 *   together find nothing
 *
 * Fires `site_search` once per settled query and `site_search_no_results` when
 * it returns nothing — GTM today, PostHog later (`lib/analytics.ts`).
 */

export const SEARCH_DEBOUNCE_MS = 250;

export type SiteSearchState =
    | {status: 'idle'}
    | {status: 'loading'; query: string}
    | {status: 'ready'; query: string; data: SearchResponse}
    | {status: 'rate-limited'; query: string; retryAfterSec: number | null}
    | {status: 'error'; query: string};

export function useSiteSearch(
    rawQuery: string,
    type: string | null,
    match: SearchMatch = 'default',
): SiteSearchState {
    const query = normalizeQuery(rawQuery);
    const [state, setState] = useState<SiteSearchState>({status: 'idle'});
    const reported = useRef<string | null>(null);

    useEffect(() => {
        if (query.length < MIN_QUERY_LENGTH) {
            setState({status: 'idle'});
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setState({status: 'loading', query});
            const params = new URLSearchParams({q: query});
            if (type) params.set('type', type);
            if (match !== 'default') params.set('match', match);
            try {
                const res = await fetch(`/api/search?${params}`, {
                    signal: controller.signal,
                });
                if (res.status === 429) {
                    const retry = Number.parseInt(res.headers.get('Retry-After') ?? '', 10);
                    setState({
                        status: 'rate-limited',
                        query,
                        retryAfterSec: Number.isFinite(retry) ? retry : null,
                    });
                    return;
                }
                if (!res.ok) {
                    setState({status: 'error', query});
                    return;
                }
                const data = (await res.json()) as SearchResponse;
                setState({status: 'ready', query, data});
                const key = `${query}|${type ?? ''}|${match}`;
                if (reported.current !== key) {
                    reported.current = key;
                    captureEvent('site_search', {
                        search_term: query,
                        search_filter: type ?? 'all',
                        results_count: data.total,
                    });
                    if (data.total === 0) {
                        captureEvent('site_search_no_results', {search_term: query});
                    }
                }
            } catch (error) {
                if ((error as {name?: string})?.name === 'AbortError') return;
                setState({status: 'error', query});
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [query, type, match]);

    return state;
}
