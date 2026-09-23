import 'server-only';

import {unstable_cache} from 'next/cache';
import {
    EXPERTISE_PAGE_FEATURED_QUERY,
    EXPERTISE_STAGE_BY_SLUG_QUERY,
    EXPERTISE_STAGE_SLUGS_QUERY,
    EXPERTISE_STAGES_QUERY,
    orderExpertiseStages,
    type ExpertisePageFeaturedDoc,
    type ExpertiseStageBySlugDoc,
    type ExpertiseStageCardDoc,
    type ExpertiseStageSlugDoc,
} from '@pakfactory/sanity/queries';
import {
    mapSanityExpertiseStage,
    mapSanityExpertiseStageCard,
} from '@/lib/expertise/map-sanity';
import type {
    ExpertiseStageCard,
    ExpertiseStagePage,
} from '@/lib/expertise/types';
import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
    WWW_CONTENT_REVALIDATE_SECONDS,
    WWW_EXPERTISE_CACHE_TAG,
    wwwExpertiseTag,
} from '@/lib/www-cache';

function normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
}

async function fetchExpertiseStageCards(): Promise<ExpertiseStageCard[]> {
    if (!isSanityConfigured()) return [];
    try {
        const client = await draftAwareClient();
        const [allDocs, pageDoc] = await Promise.all([
            client.fetch<ExpertiseStageCardDoc[]>(EXPERTISE_STAGES_QUERY),
            client.fetch<ExpertisePageFeaturedDoc>(
                EXPERTISE_PAGE_FEATURED_QUERY,
            ),
        ]);
        const all = allDocs ?? [];
        const featured = pageDoc?.featured ?? [];
        // Featured pin order first; remainder title-asc (ADR-017). Eric’s
        // canonical featured order: Design → Prototyping → Managed
        // Manufacturing → Strategy → Logistics → Fulfillment.
        const ordered = orderExpertiseStages(featured, all);
        return ordered
            .map(mapSanityExpertiseStageCard)
            .filter((item): item is ExpertiseStageCard => item != null);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[expertise] Sanity stage cards failed:', err);
        }
        return [];
    }
}

async function fetchExpertiseStageSlugs(): Promise<ExpertiseStageSlugDoc[]> {
    if (!isSanityConfigured()) return [];
    try {
        return (
            (await (
                await draftAwareClient()
            ).fetch<ExpertiseStageSlugDoc[]>(EXPERTISE_STAGE_SLUGS_QUERY)) ??
            []
        );
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[expertise] Sanity stage slugs failed:', err);
        }
        return [];
    }
}

async function fetchExpertiseStageBySlug(
    slug: string,
): Promise<ExpertiseStagePage | null> {
    if (!isSanityConfigured()) return null;
    try {
        const doc = await (
            await draftAwareClient()
        ).fetch<ExpertiseStageBySlugDoc | null>(EXPERTISE_STAGE_BY_SLUG_QUERY, {
            slug,
        });
        if (!doc) return null;
        return mapSanityExpertiseStage(doc);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[expertise] Sanity stage by slug failed:', err);
        }
        return null;
    }
}

export async function listExpertiseStageCards(): Promise<ExpertiseStageCard[]> {
    return readThrough(
        () => fetchExpertiseStageCards(),
        unstable_cache(() => fetchExpertiseStageCards(), ['www-expertise-cards'], {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_EXPERTISE_CACHE_TAG],
        }),
    );
}

export async function listExpertiseStageSlugs(): Promise<
    ExpertiseStageSlugDoc[]
> {
    return readThrough(
        () => fetchExpertiseStageSlugs(),
        unstable_cache(
            () => fetchExpertiseStageSlugs(),
            ['www-expertise-slugs'],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_EXPERTISE_CACHE_TAG],
            },
        ),
    );
}

export async function getExpertiseStage(
    slug: string,
): Promise<ExpertiseStagePage | null> {
    const key = normalizeSlug(slug);
    return readThrough(
        () => fetchExpertiseStageBySlug(key),
        unstable_cache(
            () => fetchExpertiseStageBySlug(key),
            [wwwExpertiseTag(key)],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_EXPERTISE_CACHE_TAG, wwwExpertiseTag(key)],
            },
        ),
    );
}
