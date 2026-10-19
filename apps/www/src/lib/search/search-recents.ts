'use client';

import {useCallback, useSyncExternalStore} from 'react';

/**
 * Recent searches for the ⌘K dialog (PROD-3111), in localStorage. Same shape
 * and rules as admin's `lib/search/recents.ts`; read through
 * `useSyncExternalStore` like the request store (`lib/request/request.storage.ts`),
 * so every open tab stays in step.
 */

const STORAGE_KEY = 'www-search-recents-v1';
const MAX_RECENTS = 6;

export type SearchRecent = {query: string; at: number};

const EMPTY: SearchRecent[] = [];
let cachedRaw: string | null = null;
let cached: SearchRecent[] = EMPTY;
const listeners = new Set<() => void>();

function parse(raw: string | null): SearchRecent[] {
    if (!raw) return EMPTY;
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return EMPTY;
        return parsed
            .filter(
                (item): item is SearchRecent =>
                    typeof item === 'object' &&
                    item !== null &&
                    typeof (item as SearchRecent).query === 'string' &&
                    typeof (item as SearchRecent).at === 'number',
            )
            .slice(0, MAX_RECENTS);
    } catch {
        return EMPTY;
    }
}

function getSnapshot(): SearchRecent[] {
    let raw: string | null = null;
    try {
        raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
        raw = null;
    }
    if (raw !== cachedRaw) {
        cachedRaw = raw;
        cached = parse(raw);
    }
    return cached;
}

function getServerSnapshot(): SearchRecent[] {
    return EMPTY;
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
    };
}

function write(next: SearchRecent[]) {
    try {
        if (next.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Private mode / quota: recents are a convenience, never an error.
    }
    for (const listener of listeners) listener();
}

export function useSearchRecents() {
    const recents = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const push = useCallback((query: string) => {
        const q = query.trim();
        if (!q) return;
        write(
            [
                {query: q, at: Date.now()},
                ...getSnapshot().filter((r) => r.query.toLowerCase() !== q.toLowerCase()),
            ].slice(0, MAX_RECENTS),
        );
    }, []);

    const clear = useCallback(() => write(EMPTY), []);

    return {recents, push, clear};
}
