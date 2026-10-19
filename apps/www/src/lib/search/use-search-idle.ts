'use client';

import {useEffect, useState} from 'react';

/**
 * `/api/search/idle` — product lines and quick links for the empty dialog
 * (PROD-3111). Fetched once per page load, the first time the dialog opens;
 * the route reads the cached Sanity catalog and never calls Algolia.
 */

export type SearchIdleData = {
    productLines: {
        title: string;
        href: string;
        image: string | null;
        imageAlt: string;
    }[];
    quickLinks: {label: string; href: string}[];
};

let cache: Promise<SearchIdleData | null> | null = null;

function load(): Promise<SearchIdleData | null> {
    cache ??= fetch('/api/search/idle')
        .then((res) => (res.ok ? (res.json() as Promise<SearchIdleData>) : null))
        .catch(() => null)
        .then((data) => {
            if (!data) cache = null; // retry on the next open
            return data;
        });
    return cache;
}

export function useSearchIdle(enabled: boolean): SearchIdleData | null {
    const [data, setData] = useState<SearchIdleData | null>(null);
    useEffect(() => {
        if (!enabled || data) return;
        let live = true;
        void load().then((result) => {
            if (live && result) setData(result);
        });
        return () => {
            live = false;
        };
    }, [enabled, data]);
    return data;
}
