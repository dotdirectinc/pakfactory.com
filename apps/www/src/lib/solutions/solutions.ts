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
import {getPublishedSanityClient} from '@/lib/sanity/client';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
    mapSanitySolution,
    mapSanitySolutionCard,
    isCompleteProduct,
} from '@/lib/solutions/map-sanity';
import type {
    SolutionCard,
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
        const docs = await getPublishedSanityClient().fetch<
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
        const doc = await getPublishedSanityClient().fetch<
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
        const docs = await getPublishedSanityClient().fetch<
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
            (await getPublishedSanityClient().fetch<SolutionPageSlugDoc[]>(
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
        const docs = await getPublishedSanityClient().fetch<
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
    return unstable_cache(
        () => fetchSolutionBySlug(key),
        [wwwSolutionTag(key), 'v2-related-products'],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_SOLUTIONS_CACHE_TAG, wwwSolutionTag(key)],
        },
    )();
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

    const products = await unstable_cache(
        () => fetchSolutionLineProducts(solutionKey, lineKey),
        [`${wwwSolutionTag(solutionKey)}:line:${lineKey}`],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_SOLUTIONS_CACHE_TAG, wwwSolutionTag(solutionKey)],
        },
    )();

    return {solution, line, products};
}

export async function listSolutionsWithPages(): Promise<SolutionCard[]> {
    return unstable_cache(
        fetchSolutionsWithPages,
        [WWW_SOLUTIONS_CACHE_TAG, 'with-pages'],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_SOLUTIONS_CACHE_TAG],
        },
    )();
}

export async function listSolutionPageSlugs(): Promise<
    Array<{slug: string; lineSlugs: string[]}>
> {
    const docs = await unstable_cache(
        fetchSolutionPageSlugs,
        [WWW_SOLUTIONS_CACHE_TAG, 'page-slugs'],
        {
            revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
            tags: [WWW_SOLUTIONS_CACHE_TAG],
        },
    )();

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
