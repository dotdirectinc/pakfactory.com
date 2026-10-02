import 'server-only';

import {unstable_cache} from 'next/cache';
import {cache} from 'react';
import {HOME_PAGE_QUERY} from '@pakfactory/sanity/queries';
import type {PageSection} from '@/components/sections/registry';
import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
    WWW_CONTENT_REVALIDATE_SECONDS,
    WWW_HOME_PAGE_CACHE_TAG,
} from '@/lib/www-cache';

export type HomeDoc = {
    title?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    sections?: PageSection[] | null;
};

async function fetchHomePage(): Promise<HomeDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (
            await draftAwareClient()
        ).fetch<HomeDoc | null>(HOME_PAGE_QUERY);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[home] Sanity home page failed:', err);
        }
        return null;
    }
}

/**
 * Studio singleton `homePage` (PROD-2666), cached (PROD-2755). The webhook
 * busts `WWW_HOME_PAGE_CACHE_TAG` on every call: Home sections dereference
 * products, lines, styles, solutions, customizations, expertise and case
 * studies, so nearly any edit can change it. React `cache` keeps metadata and
 * page on one read per request, draft mode included.
 */
export const getHomePage = cache(
    async (): Promise<HomeDoc | null> =>
        readThrough(
            () => fetchHomePage(),
            unstable_cache(() => fetchHomePage(), ['www-home-page'], {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_HOME_PAGE_CACHE_TAG],
            }),
        ),
);
