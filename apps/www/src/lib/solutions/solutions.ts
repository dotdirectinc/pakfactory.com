import 'server-only';

import {unstable_cache} from 'next/cache';
import {
    SOLUTION_BY_SLUG_QUERY,
    SOLUTION_LINE_PRODUCTS_QUERY,
    SOLUTION_PAGE_SLUGS_QUERY,
    SOLUTION_STYLES_FILTER_QUERY,
    SOLUTION_TAGGED_PRODUCTS_QUERY,
    SOLUTIONS_WITH_PAGES_QUERY,
    CATALOG_PRODUCT_FIELDS,
    type CatalogProductDoc,
    type PageSectionDoc,
    type SolutionBySlugDoc,
    type SolutionPageSlugDoc,
    type SolutionStyleFilterDoc,
    type SolutionWithPageDoc,
} from '@pakfactory/sanity/queries';
import {
    filterParams,
    hasAnyCondition,
    solutionStyleProductFilter,
    solutionStyleQueryParams,
    SOLUTION_STYLE_ORDER,
} from '@pakfactory/sanity/solution-style-filter';
import {mapSanityProduct} from '@/lib/catalog/map-sanity';
import type {Product} from '@/lib/catalog/types';
import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
    mapSanitySolution,
    mapSanitySolutionCard,
    isCompleteProduct,
} from '@/lib/solutions/map-sanity';
import {buildSolutionLandingContent} from '@/lib/solutions/landing-content';
import {
    applyFaqInherit,
    applyInspirationsInherit,
    applyVideoCaseStudiesInherit,
    mergeSolutionSections,
} from '@/lib/sections/merge-solution-sections';
import {
    applySectionTokens,
    sectionTokenContextFromHost,
} from '@/lib/sections/resolve-section-tokens';
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

/** Cap matches Industry LP hero desktop tile budget. */
const MAX_HERO_STYLE_PRODUCTS = 16;

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

/**
 * Union of inspiration products matching any solutionStyle under this solution.
 * Uses shared solution-style-filter (same membership as Studio match counts).
 */
async function fetchStyleMatchedHeroProducts(
    solutionId: string,
): Promise<Product[]> {
    if (!isSanityConfigured() || !solutionId) return [];
    try {
        const client = await draftAwareClient();
        const styles = await client.fetch<SolutionStyleFilterDoc[]>(
            SOLUTION_STYLES_FILTER_QUERY,
            {solutionId},
        );
        if (!styles?.length) return [];

        const byId = new Map<string, Product>();

        for (const style of styles) {
            const raw = style.filter;
            const authoredFilter = raw
                ? {
                      productLines: raw.productLines ?? undefined,
                      productStyles: raw.productStyles ?? undefined,
                      keywords: raw.keywords ?? undefined,
                  }
                : undefined;
            const params = filterParams(
                solutionId,
                authoredFilter,
                style.excludedProducts ?? undefined,
            );
            if (!hasAnyCondition(params)) continue;
            const filter = solutionStyleProductFilter(params);
            if (!filter) continue;

            // CATALOG_PRODUCT_FIELDS includes availableCustomizations for hero preview.
            const query = `*[${filter} && (status == "active" || !defined(status))] | ${SOLUTION_STYLE_ORDER} [0...${MAX_HERO_STYLE_PRODUCTS}] {
  ${CATALOG_PRODUCT_FIELDS}
}`;
            const docs = await client.fetch<CatalogProductDoc[]>(
                query,
                solutionStyleQueryParams(params),
            );
            for (const doc of docs ?? []) {
                const product = mapSanityProduct(doc);
                if (!product?.slug || !product.title) continue;
                if (!byId.has(product.slug)) {
                    byId.set(product.slug, product);
                }
            }
        }

        return Array.from(byId.values()).slice(0, MAX_HERO_STYLE_PRODUCTS);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error(
                '[solutions] Style-matched hero products failed:',
                err,
            );
        }
        return [];
    }
}

type SolutionBySlugResult = {
    page: SolutionPage;
    sections: PageSectionDoc[];
    heroProducts: Product[];
};

async function fetchSolutionBySlug(
    slug: string,
): Promise<SolutionBySlugResult | null> {
    if (!isSanityConfigured()) return null;
    try {
        const doc = await (await draftAwareClient()).fetch<
            SolutionBySlugDoc | null
        >(SOLUTION_BY_SLUG_QUERY, {slug});
        if (!doc || doc.hasPage !== true) return null;
        const mapped = mapSanitySolution(doc);
        if (!mapped) return null;

        const contentSections = (doc.sections ?? []).filter(
            (section): section is PageSectionDoc =>
                Boolean(section?._key && section?._type),
        );
        const templateSections = (doc.template?.sections ?? []).filter(
            (section): section is PageSectionDoc =>
                Boolean(section?._key && section?._type),
        );

        // Template path: merge order/chrome from template with content on the solution.
        // Fallback: solution.sections alone (pre-seed dual-path) when no template stack.
        // Inherit: FAQs / inspirations / video case studies from document defaults.
        const sections =
            templateSections.length > 0
                ? mergeSolutionSections(
                      templateSections,
                      contentSections,
                      doc.relatedCaseStudies,
                      doc.faqs,
                      doc.relatedSolutionStyles,
                      doc.relatedVideoCaseStudies,
                  )
                : applyVideoCaseStudiesInherit(
                      applyInspirationsInherit(
                          applyFaqInherit(contentSections, doc.faqs),
                          doc.relatedSolutionStyles,
                      ),
                      doc.relatedVideoCaseStudies,
                  );

        const tokenizedSections = applySectionTokens(
            sections,
            sectionTokenContextFromHost(doc),
        );

        const curated = mapped.relatedProducts.filter(isCompleteProduct);
        const tagged =
            curated.length > 0
                ? curated
                : await fetchTaggedProducts(slug);
        const heroProducts = await fetchStyleMatchedHeroProducts(doc._id);

        return {
            page: {...mapped, relatedProducts: tagged},
            sections: tokenizedSections,
            heroProducts,
        };
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
    const result = await getSolutionBySlugResult(slug);
    return result?.page ?? null;
}

async function getSolutionBySlugResult(
    slug: string,
): Promise<SolutionBySlugResult | null> {
    const key = normalizeSlug(slug);
    return readThrough(
        () => fetchSolutionBySlug(key),
        unstable_cache(
            () => fetchSolutionBySlug(key),
            [wwwSolutionTag(key), 'v7-hero-customizations'],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_SOLUTIONS_CACHE_TAG, wwwSolutionTag(key)],
            },
        ),
    );
}

/**
 * Industry Solution LP payload for `/solutions/[slug]`.
 * Hero from Sanity page fields; body from merged template × content sections.
 * Requires a hasPage solution in Sanity (no local fixture fallback).
 */
export async function getSolutionLandingContent(
    slug: string,
): Promise<SolutionLandingContent | null> {
    const key = normalizeSlug(slug);
    const fromSanity = await getSolutionBySlugResult(key);
    if (!fromSanity) return null;

    return buildSolutionLandingContent(
        fromSanity.page,
        fromSanity.sections,
        undefined,
        fromSanity.heroProducts,
    );
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
