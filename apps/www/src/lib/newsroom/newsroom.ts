import 'server-only';

import {cache} from 'react';
import {
    LATEST_PRESS_RELEASES_QUERY,
    PRESS_RELEASE_OTHERS_COUNT_QUERY,
    NEWSROOM_CATALOG_PAGE_QUERY,
    NEWSROOM_PRESS_SETTINGS_QUERY,
    PRESS_RELEASE_BY_SLUG_QUERY,
    PRESS_RELEASE_SITEMAP_QUERY,
    PRESS_RELEASE_SLUGS_QUERY,
    PRESS_RELEASES_LIST_QUERY,
    type NewsroomCatalogPageDoc,
    type NewsroomPressSettingsDoc,
    type PageSectionDoc,
    type PageSectionPressReleasesRowDoc,
    type PressReleaseCardDoc,
    type PressReleaseDetailDoc,
    type PressReleaseSitemapEntry,
    type PressReleaseSlugDoc,
} from '@pakfactory/sanity/queries';

import {mapNewsCards, mapNewsItem} from '@/lib/newsroom/map-sanity';
import type {
    NewsItem,
    NewsroomCatalog,
    PressBoilerplate,
} from '@/lib/newsroom/types';
import {getPublishedSanityClient} from '@/lib/sanity/client';
import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {sanityCache, sanityReadFailed} from '@/lib/sanity/sanity-cache';
import {
    WWW_CONTENT_REVALIDATE_SECONDS,
    WWW_NEWSROOM_CACHE_TAG,
} from '@/lib/www-cache';

/**
 * Newsroom data (PROD-2913 `/newsroom`, PROD-2918 `/newsroom/[slug]`).
 *
 * Every query carries the `publishedAt <= now()` gate (see
 * `@pakfactory/sanity/queries/newsroom`). Cached reads revalidate every
 * {@link WWW_CONTENT_REVALIDATE_SECONDS}, so a future-dated release appears
 * within that window of its release time — never before it.
 */

const CACHE_OPTIONS = {
    revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
    tags: [WWW_NEWSROOM_CACHE_TAG],
};

/**
 * Bump when the SHAPE of a cached result changes. The data cache stores mapped
 * results and survives deploys, so without a new key a deploy reads the old
 * shape until it revalidates (v2: `hasMore` on press release rows; v3: press
 * boilerplate without fallbacks).
 */
const CACHE_VERSION = 'v3';

/** Studio default for a new row (`rowSectionFields`). */
const DEFAULT_ROW_COUNT = 3;

async function fetchDraftAware<T>(
    label: string,
    query: string,
    params: Record<string, unknown> = {},
): Promise<T> {
    try {
        return await (await draftAwareClient()).fetch<T>(query, params);
    } catch (err) {
        throw sanityReadFailed(`[newsroom] ${label} failed:`, err);
    }
}

function isPressReleasesRow(
    section: PageSectionDoc,
): section is PageSectionPressReleasesRowDoc {
    return section._type === 'pressReleasesRow';
}

/**
 * `pressReleasesRow` has no derive source (PROD-2909 handoff, "the derive
 * contract"): empty `curatedItems` means the latest `count` releases,
 * excluding the one being read. Pins win; the current release is never listed
 * as related to itself, even when pinned. `hasMore` (more releases exist than
 * the row lists) gates the "See all announcements" link.
 */
async function fillPressReleaseRows(
    sections: PageSectionDoc[],
    excludeId: string,
): Promise<PageSectionDoc[]> {
    const rows = sections.filter(isPressReleasesRow);
    if (rows.length === 0) return sections;

    let latest: PressReleaseCardDoc[] | null = null;
    const loadLatest = async () => {
        latest ??= await fetchDraftAware<PressReleaseCardDoc[]>(
            'latest releases',
            LATEST_PRESS_RELEASES_QUERY,
            {excludeId},
        );
        return latest ?? [];
    };
    let others: number | null = null;
    const countOthers = async () => {
        others ??= await fetchDraftAware<number>(
            'release count',
            PRESS_RELEASE_OTHERS_COUNT_QUERY,
            {excludeId},
        );
        return others ?? 0;
    };

    return Promise.all(
        sections.map(async (section) => {
            if (!isPressReleasesRow(section)) return section;
            const count =
                typeof section.count === 'number' && section.count > 0
                    ? section.count
                    : DEFAULT_ROW_COUNT;
            const pinned = (section.items ?? []).filter(
                (item) => item._id !== excludeId,
            );
            const items =
                pinned.length > 0
                    ? pinned
                    : (await loadLatest()).slice(0, count);
            const hasMore = (await countOthers()) > items.length;
            return {...section, items, hasMore};
        }),
    );
}

// ─── /newsroom ────────────────────────────────────────────────────────────────

async function fetchNewsroomCatalog(): Promise<NewsroomCatalog> {
    if (!isSanityConfigured()) return {items: [], sections: []};

    const [docs, page] = await Promise.all([
        fetchDraftAware<PressReleaseCardDoc[]>(
            'release list',
            PRESS_RELEASES_LIST_QUERY,
        ),
        fetchDraftAware<NewsroomCatalogPageDoc | null>(
            'catalog page',
            NEWSROOM_CATALOG_PAGE_QUERY,
        ),
    ]);

    // Pins first, in editor order; then everything else newest-first.
    const featured = mapNewsCards(page?.featured);
    const featuredIds = new Set(featured.map((card) => card.id));
    const rest = mapNewsCards(docs).filter((card) => !featuredIds.has(card.id));

    return {
        items: [...featured, ...rest],
        sections: await fillPressReleaseRows(page?.sections ?? [], ''),
    };
}

export const getNewsroomCatalog = cache(
    async (): Promise<NewsroomCatalog> =>
        readThrough(
            fetchNewsroomCatalog,
            sanityCache(
                fetchNewsroomCatalog,
                [WWW_NEWSROOM_CACHE_TAG, 'catalog', CACHE_VERSION],
                CACHE_OPTIONS,
            ),
        ),
);

// ─── /newsroom/[slug] ─────────────────────────────────────────────────────────

async function fetchNewsItem(slug: string): Promise<NewsItem | null> {
    if (!isSanityConfigured() || !slug) return null;
    const doc = await fetchDraftAware<PressReleaseDetailDoc | null>(
        'release by slug',
        PRESS_RELEASE_BY_SLUG_QUERY,
        {slug},
    );
    if (!doc) return null;
    const item = mapNewsItem(doc);
    if (!item) return null;
    return {
        ...item,
        sections: await fillPressReleaseRows(item.sections, item.id),
    };
}

export const getNewsItemBySlug = cache(
    async (slug: string): Promise<NewsItem | null> => {
        const normalized = slug.trim().toLowerCase();
        return readThrough(
            () => fetchNewsItem(normalized),
            () =>
                sanityCache(
                    fetchNewsItem,
                    [WWW_NEWSROOM_CACHE_TAG, 'item', CACHE_VERSION],
                    CACHE_OPTIONS,
                )(normalized),
        );
    },
);

async function fetchNewsSlugs(): Promise<PressReleaseSlugDoc[]> {
    if (!isSanityConfigured()) return [];
    return fetchDraftAware<PressReleaseSlugDoc[]>(
        'release slugs',
        PRESS_RELEASE_SLUGS_QUERY,
    );
}

/** Slugs for `generateStaticParams`. */
export async function listNewsSlugs(): Promise<string[]> {
    const docs = await readThrough(
        fetchNewsSlugs,
        sanityCache(
            fetchNewsSlugs,
            [WWW_NEWSROOM_CACHE_TAG, 'slugs'],
            CACHE_OPTIONS,
        ),
    );
    return docs.map((doc) => doc.slug).filter(Boolean);
}

// ─── Boilerplate ──────────────────────────────────────────────────────────────

async function fetchPressBoilerplate(): Promise<PressBoilerplate> {
    // No hardcoded copy: whatever Global Settings leaves empty renders nothing.
    const empty: PressBoilerplate = {
        companyName: null,
        description: null,
        pressEmail: null,
        logoUrl: null,
    };
    if (!isSanityConfigured()) return empty;
    const doc = await fetchDraftAware<NewsroomPressSettingsDoc | null>(
        'press settings',
        NEWSROOM_PRESS_SETTINGS_QUERY,
    );
    return {
        companyName: doc?.companyName?.trim() || null,
        description: doc?.companyDescription?.trim() || null,
        pressEmail: doc?.pressEmail?.trim() || null,
        logoUrl: doc?.logoUrl?.trim() || null,
    };
}

/** "About PakFactory" + media contact, from Global Settings → Company. */
export const getPressBoilerplate = cache(
    async (): Promise<PressBoilerplate> =>
        readThrough(
            fetchPressBoilerplate,
            sanityCache(
                fetchPressBoilerplate,
                [WWW_NEWSROOM_CACHE_TAG, 'boilerplate', CACHE_VERSION],
                CACHE_OPTIONS,
            ),
        ),
);

// ─── Sitemap ──────────────────────────────────────────────────────────────────

/** Published-only (never draft-aware) — a sitemap must not list drafts. */
export async function listNewsSitemapEntries(): Promise<
    PressReleaseSitemapEntry[]
> {
    if (!isSanityConfigured()) return [];
    return getPublishedSanityClient()
        .fetch<PressReleaseSitemapEntry[]>(PRESS_RELEASE_SITEMAP_QUERY)
        .catch((err: unknown) => {
            console.error('[newsroom] sitemap entries failed:', err);
            return [];
        });
}
