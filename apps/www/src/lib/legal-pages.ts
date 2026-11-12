import 'server-only';

import {cache} from 'react';
import {
    LEGAL_PAGE_BY_ID_QUERY,
    LEGAL_PAGES_LIST_QUERY,
    type LegalPageDoc,
    type LegalPageListItem,
} from '@pakfactory/sanity/queries';
import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {sanityCache, sanityReadFailed} from '@/lib/sanity/sanity-cache';
import {
    WWW_CONTENT_REVALIDATE_SECONDS,
    WWW_LEGAL_PAGES_CACHE_TAG,
} from '@/lib/www-cache';
import {WWW_ROUTES} from '@/lib/www-routes';

/** Route slug → pinned Legal Page `_id`. Legal pages have no CMS slug field. */
export const LEGAL_PAGE_SLUG_TO_ID = {
    'privacy-policy': 'privacyPage',
    'terms-of-service': 'termsPage',
} as const;

export type LegalPageSlug = keyof typeof LEGAL_PAGE_SLUG_TO_ID;
export type LegalPagePinnedId =
    (typeof LEGAL_PAGE_SLUG_TO_ID)[LegalPageSlug];

export function isLegalPageSlug(slug: string): slug is LegalPageSlug {
    return slug in LEGAL_PAGE_SLUG_TO_ID;
}

export function legalPageHref(id: string): string | null {
    if (id === 'privacyPage') return WWW_ROUTES.privacyPolicy;
    if (id === 'termsPage') return WWW_ROUTES.termsOfService;
    return null;
}

async function fetchLegalPageById(
    id: LegalPagePinnedId,
): Promise<LegalPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (
            await draftAwareClient()
        ).fetch<LegalPageDoc | null>(LEGAL_PAGE_BY_ID_QUERY, {id});
    } catch (err) {
        throw sanityReadFailed(`[legal-page] Sanity ${id} failed:`, err);
    }
}

async function fetchLegalPagesList(): Promise<LegalPageListItem[]> {
    if (!isSanityConfigured()) return [];
    try {
        return await (
            await draftAwareClient()
        ).fetch<LegalPageListItem[]>(LEGAL_PAGES_LIST_QUERY);
    } catch (err) {
        throw sanityReadFailed('[legal-page] Sanity list failed:', err);
    }
}

export const getLegalPageById = cache(
    async (id: LegalPagePinnedId): Promise<LegalPageDoc | null> =>
        readThrough(
            () => fetchLegalPageById(id),
            sanityCache(
                () => fetchLegalPageById(id),
                [`${WWW_LEGAL_PAGES_CACHE_TAG}:${id}`],
                {
                    revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                    tags: [WWW_LEGAL_PAGES_CACHE_TAG],
                },
            ),
        ),
);

export const getLegalPageBySlug = cache(
    async (slug: string): Promise<LegalPageDoc | null> => {
        if (!isLegalPageSlug(slug)) return null;
        return getLegalPageById(LEGAL_PAGE_SLUG_TO_ID[slug]);
    },
);

export const listLegalPages = cache(
    async (): Promise<LegalPageListItem[]> =>
        readThrough(
            () => fetchLegalPagesList(),
            sanityCache(
                () => fetchLegalPagesList(),
                [`${WWW_LEGAL_PAGES_CACHE_TAG}:list`],
                {
                    revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                    tags: [WWW_LEGAL_PAGES_CACHE_TAG],
                },
            ),
        ),
);
