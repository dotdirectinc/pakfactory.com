import 'server-only';

import {unstable_cache} from 'next/cache';
import {
    SOLUTION_BY_SLUG_QUERY,
    SOLUTION_LINE_PRODUCTS_QUERY,
    SOLUTION_PAGE_SLUGS_QUERY,
    SOLUTION_TAGGED_PRODUCTS_QUERY,
    SOLUTIONS_WITH_PAGES_QUERY,
    type CatalogProductDoc,
    type SolutionBySlugDoc,
    type SolutionPageSlugDoc,
    type SolutionWithPageDoc,
} from '@pakfactory/sanity/queries';
import {mapSanityProduct} from '@/lib/catalog/map-sanity';
import type {Product} from '@/lib/catalog/types';
import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
    mapSanitySolution,
    mapSanitySolutionCard,
    isCompleteProduct,
} from '@/lib/solutions/map-sanity';
import {
    beautyCosmeticsInspirations,
    beautyCosmeticsLogos,
    beautyCosmeticsSolutionPage,
} from '@/lib/solutions/fixtures/beauty-cosmetics';
import {
    buildSolutionLandingContent,
    isBeautyCosmeticsSlug,
} from '@/lib/solutions/landing-content';
import type {
    SolutionCard,
    SolutionLandingContent,
    SolutionLineCatalog,
    SolutionPage,
} from '@/lib/solutions/types';
import {
    WWW_CONTENT_REVALIDATE_SECONDS,
    WWW_SOLUTIONS_CACHE_TAG,
    wwwSolutionTag,
} from '@/lib/www-cache';

function normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
}

async function fetchTaggedProducts(
    solutionSlug: string,
): Promise<Product[]> {
    if (!isSanityConfigured()) return [];
    try {
        const docs = await (await draftAwareClient()).fetch<
            CatalogProductDoc[]
        >(SOLUTION_TAGGED_PRODUCTS_QUERY, {solutionSlug});
        return (docs ?? [])
            .map(mapSanityProduct)
            .filter((item): item is Product => item != null)
            .filter(isCompleteProduct);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error(
                '[solutions] Sanity tagged products failed:',
                err,
            );
        }
        return [];
    }
}

async function fetchSolutionBySlug(
    slug: string,
): Promise<SolutionPage | null> {
    if (!isSanityConfigured()) return null;
    try {
        const doc = await (await draftAwareClient()).fetch<
            SolutionBySlugDoc | null
        >(SOLUTION_BY_SLUG_QUERY, {slug});
        if (!doc || doc.hasPage !== true) return null;
        const mapped = mapSanitySolution(doc);
        if (!mapped) return null;

        const curated = mapped.relatedProducts.filter(isCompleteProduct);
        if (curated.length > 0) {
            return {...mapped, relatedProducts: curated};
        }

        const tagged = await fetchTaggedProducts(slug);
        return {...mapped, relatedProducts: tagged};
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[solutions] Sanity solution by slug failed:', err);
        }
        return null;
    }
}

async function fetchSolutionLineProducts(
    solutionSlug: string,
    lineSlug: string,
): Promise<Product[]> {
    if (!isSanityConfigured()) return [];
    try {
        const docs = await (await draftAwareClient()).fetch<
            CatalogProductDoc[]
        >(SOLUTION_LINE_PRODUCTS_QUERY, {solutionSlug, lineSlug});
        return (docs ?? [])
            .map(mapSanityProduct)
            .filter((item): item is Product => item != null);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error(
                '[solutions] Sanity solution line products failed:',
                err,
            );
        }
        return [];
    }
}

async function fetchSolutionPageSlugs(): Promise<SolutionPageSlugDoc[]> {
    if (!isSanityConfigured()) return [];
    try {
        return (
            (await (await draftAwareClient()).fetch<SolutionPageSlugDoc[]>(
                SOLUTION_PAGE_SLUGS_QUERY,
            )) ?? []
        );
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[solutions] Sanity page slugs failed:', err);
        }
        return [];
    }
}

async function fetchSolutionsWithPages(): Promise<SolutionCard[]> {
    if (!isSanityConfigured()) return [];
    try {
        const docs = await (await draftAwareClient()).fetch<
            SolutionWithPageDoc[]
        >(SOLUTIONS_WITH_PAGES_QUERY);
        return (docs ?? [])
            .map(mapSanitySolutionCard)
            .filter((item): item is SolutionCard => item != null);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[solutions] Sanity solutions with pages failed:', err);
        }
        return [];
    }
}

export async function getSolutionBySlug(
    slug: string,
): Promise<SolutionPage | null> {
    const key = normalizeSlug(slug);
    return readThrough(
        () => fetchSolutionBySlug(key),
        unstable_cache(
            () => fetchSolutionBySlug(key),
            [wwwSolutionTag(key), 'v2-related-products'],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_SOLUTIONS_CACHE_TAG, wwwSolutionTag(key)],
            },
        ),
    );
}

/**
 * Industry Solution LP payload for `/solutions/[slug]`.
 * Hero is built from Sanity page fields for every hasPage solution.
 * Falls back to a minimal Beauty page when Sanity has no hasPage doc yet.
 * Beauty logos + inspirations use local fixtures until Sanity fields land.
 */
export async function getSolutionLandingContent(
    slug: string,
): Promise<SolutionLandingContent | null> {
    const key = normalizeSlug(slug);
    const fromSanity = await getSolutionBySlug(key);
    const beautyBands = isBeautyCosmeticsSlug(key)
        ? {
              logos: beautyCosmeticsLogos,
              inspirations: beautyCosmeticsInspirations,
          }
        : undefined;

    if (fromSanity) {
        return buildSolutionLandingContent(fromSanity, beautyBands);
    }

    if (isBeautyCosmeticsSlug(key)) {
        return buildSolutionLandingContent(
            beautyCosmeticsSolutionPage,
            beautyBands,
        );
    }

    return null;
}

export async function getSolutionLineCatalog(
    solutionSlug: string,
    lineSlug: string,
): Promise<SolutionLineCatalog | null> {
    const solutionKey = normalizeSlug(solutionSlug);
    const lineKey = normalizeSlug(lineSlug);

    const solution = await getSolutionBySlug(solutionKey);
    if (!solution) return null;

    const line = solution.packagingFormats.find(
        (format) => format.slug === lineKey,
    );
    if (!line) return null;

    const products = await readThrough(
        () => fetchSolutionLineProducts(solutionKey, lineKey),
        unstable_cache(
            () => fetchSolutionLineProducts(solutionKey, lineKey),
            [`${wwwSolutionTag(solutionKey)}:line:${lineKey}`],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_SOLUTIONS_CACHE_TAG, wwwSolutionTag(solutionKey)],
            },
        ),
    );

    return {solution, line, products};
}

export async function listSolutionsWithPages(): Promise<SolutionCard[]> {
    return readThrough(
        fetchSolutionsWithPages,
        unstable_cache(
            fetchSolutionsWithPages,
            [WWW_SOLUTIONS_CACHE_TAG, 'with-pages'],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_SOLUTIONS_CACHE_TAG],
            },
        ),
    );
}

export async function listSolutionPageSlugs(): Promise<
    Array<{slug: string; lineSlugs: string[]}>
> {
    const docs = await readThrough(
        fetchSolutionPageSlugs,
        unstable_cache(
            fetchSolutionPageSlugs,
            [WWW_SOLUTIONS_CACHE_TAG, 'page-slugs'],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_SOLUTIONS_CACHE_TAG],
            },
        ),
    );

    return docs
        .map((doc) => {
            const slug = doc.slug?.trim();
            if (!slug) return null;
            const lineSlugs = (doc.packagingFormats ?? [])
                .map((format) => format.slug?.trim())
                .filter((value): value is string => Boolean(value));
            return {slug, lineSlugs};
        })
        .filter(
            (item): item is {slug: string; lineSlugs: string[]} => item != null,
        );
}
