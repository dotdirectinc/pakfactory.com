import 'server-only';

import {cache} from 'react';
import {
    CONTENT_PAGE_BY_ID_QUERY,
    CONTENT_PAGE_BY_SLUG_QUERY,
    CONTENT_PAGE_SLUGS_QUERY,
    CONTENT_PAGE_SITEMAP_QUERY,
    type ContentPageDoc,
    type ContentPagePinnedId,
    type ContentPageSitemapEntry,
} from '@pakfactory/sanity/queries';
import {getPublishedSanityClient} from '@/lib/sanity/client';
import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {sanityCache, sanityReadFailed} from '@/lib/sanity/sanity-cache';
import {
    WWW_CONTENT_PAGES_CACHE_TAG,
    WWW_CONTENT_REVALIDATE_SECONDS,
} from '@/lib/www-cache';

/**
 * Top-level path segments that already have app routes (or reserved chrome).
 * A Content Page must not claim these via `/{slug}`.
 */
export const RESERVED_WWW_CONTENT_SLUGS = new Set([
    'about',
    'account',
    'api',
    'bookmarks',
    'bundles',
    'case-studies',
    'contact',
    'customizations',
    'expertise',
    'forgot-password',
    'help',
    'login',
    'newsroom',
    'policies',
    'products',
    'request',
    'reset-password',
    'search',
    'sign-up',
    'sitemap',
    'solutions',
    'test',
    'verify',
]);

async function fetchContentPageById(
    id: ContentPagePinnedId,
): Promise<ContentPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (
            await draftAwareClient()
        ).fetch<ContentPageDoc | null>(CONTENT_PAGE_BY_ID_QUERY, {id});
    } catch (err) {
        throw sanityReadFailed(`[content-page] Sanity ${id} failed:`, err);
    }
}

async function fetchContentPageBySlug(
    slug: string,
): Promise<ContentPageDoc | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (
            await draftAwareClient()
        ).fetch<ContentPageDoc | null>(CONTENT_PAGE_BY_SLUG_QUERY, {slug});
    } catch (err) {
        throw sanityReadFailed(
            `[content-page] Sanity slug "${slug}" failed:`,
            err,
        );
    }
}

async function fetchContentPageSlugs(): Promise<{slug: string}[]> {
    if (!isSanityConfigured()) return [];
    try {
        return await (
            await draftAwareClient()
        ).fetch<{slug: string}[]>(CONTENT_PAGE_SLUGS_QUERY);
    } catch (err) {
        throw sanityReadFailed('[content-page] Sanity slugs failed:', err);
    }
}

/** Published-only — sitemaps must not list drafts. */
async function fetchContentPageSitemap(): Promise<ContentPageSitemapEntry[]> {
    if (!isSanityConfigured()) return [];
    try {
        return await getPublishedSanityClient().fetch<
            ContentPageSitemapEntry[]
        >(CONTENT_PAGE_SITEMAP_QUERY);
    } catch (err) {
        throw sanityReadFailed('[content-page] Sanity sitemap failed:', err);
    }
}

/** Pinned Content Page (`aboutPage`, `contactPage`). */
export const getContentPageById = cache(
    async (id: ContentPagePinnedId): Promise<ContentPageDoc | null> =>
        readThrough(
            () => fetchContentPageById(id),
            sanityCache(
                () => fetchContentPageById(id),
                [`${WWW_CONTENT_PAGES_CACHE_TAG}:${id}`],
                {
                    revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                    tags: [WWW_CONTENT_PAGES_CACHE_TAG],
                },
            ),
        ),
);

/** Slugged Content Page (e.g. Sustainability). Reserved app paths 404. */
export const getContentPageBySlug = cache(
    async (slug: string): Promise<ContentPageDoc | null> => {
        if (!slug || RESERVED_WWW_CONTENT_SLUGS.has(slug)) return null;
        return readThrough(
            () => fetchContentPageBySlug(slug),
            sanityCache(
                () => fetchContentPageBySlug(slug),
                [`${WWW_CONTENT_PAGES_CACHE_TAG}:slug:${slug}`],
                {
                    revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                    tags: [WWW_CONTENT_PAGES_CACHE_TAG],
                },
            ),
        );
    },
);

export const listContentPageSlugs = cache(
    async (): Promise<string[]> => {
        const rows = await readThrough(
            () => fetchContentPageSlugs(),
            sanityCache(
                () => fetchContentPageSlugs(),
                [`${WWW_CONTENT_PAGES_CACHE_TAG}:slugs`],
                {
                    revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                    tags: [WWW_CONTENT_PAGES_CACHE_TAG],
                },
            ),
        );
        return (rows ?? [])
            .map((row) => row.slug?.trim())
            .filter(
                (slug): slug is string =>
                    Boolean(slug) && !RESERVED_WWW_CONTENT_SLUGS.has(slug),
            );
    },
);

/** Published, indexable slugged content pages for sitemap.xml / HTML sitemap. */
export const listContentPageSitemapEntries = cache(
    async (): Promise<ContentPageSitemapEntry[]> => {
        const rows = await sanityCache(
            () => fetchContentPageSitemap(),
            [`${WWW_CONTENT_PAGES_CACHE_TAG}:sitemap`],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_CONTENT_PAGES_CACHE_TAG],
            },
        )();
        return (rows ?? []).filter(
            (row) =>
                Boolean(row.slug?.trim()) &&
                !RESERVED_WWW_CONTENT_SLUGS.has(row.slug),
        );
    },
);
