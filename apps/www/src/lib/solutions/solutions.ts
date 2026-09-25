import 'server-only';

import {unstable_cache} from 'next/cache';
import {
    CATALOG_PRODUCT_LIBRARY_FIELDS,
    SOLUTION_BY_SLUG_QUERY,
    SOLUTION_HERO_PRODUCTS_QUERY,
    SOLUTION_LINE_PRODUCTS_QUERY,
    SOLUTION_PAGE_SLUGS_QUERY,
    SOLUTION_STYLE_BY_SLUGS_QUERY,
    SOLUTION_STYLE_PAGE_PARAMS_QUERY,
    SOLUTION_STYLES_FOR_SOLUTION_QUERY,
    SOLUTION_TAGGED_PRODUCTS_QUERY,
    SOLUTIONS_WITH_PAGES_QUERY,
    type CatalogProductDoc,
    type CatalogProductLibraryDoc,
    type PageSectionDoc,
    type SolutionBySlugDoc,
    type SolutionPageSlugDoc,
    type SolutionStyleBySlugsDoc,
    type SolutionStyleCardDoc,
    type SolutionStylePageParamDoc,
    type SolutionWithPageDoc,
} from '@pakfactory/sanity/queries';
import {
    filterParams,
    solutionStyleProductFilter,
    solutionStyleQueryParams,
    SOLUTION_STYLE_ORDER,
} from '@pakfactory/sanity/solution-style-filter';
import {buildProductLibraryResult} from '@/lib/catalog/build-product-library';
import {
    mapSanityProduct,
    mapSanityProductLibraryItem,
    mapSanityProductLibraryLineMeta,
} from '@/lib/catalog/map-sanity';
import type {
    Product,
    ProductLibraryItem,
    ProductLibraryLineMeta,
    ProductLibraryResult,
} from '@/lib/catalog/types';
import {PRODUCT_CATALOG_INDUSTRY_FACET_ID} from '@/lib/catalog/types';
import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
    mapSanitySolution,
    mapSanitySolutionCard,
    mapSanitySolutionStyleCard,
    mapSanitySolutionStylePage,
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
    SolutionStyleCard,
    SolutionStyleCatalog,
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

/**
 * Industry LP hero tiles — products tagged to this solution via Solutions
 * categorization (same membership as related-products fallback).
 */
async function fetchHeroTaggedProducts(
    solutionSlug: string,
): Promise<Product[]> {
    if (!isSanityConfigured() || !solutionSlug) return [];
    try {
        const docs = await (await draftAwareClient()).fetch<
            CatalogProductDoc[]
        >(SOLUTION_HERO_PRODUCTS_QUERY, {solutionSlug});
        return (docs ?? [])
            .map(mapSanityProduct)
            .filter((item): item is Product => item != null)
            .filter(isCompleteProduct);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error(
                '[solutions] Sanity hero tagged products failed:',
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
        const heroProducts = await fetchHeroTaggedProducts(slug);

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
            [wwwSolutionTag(key), 'v9-hero-featured-image'],
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

function emptyProductLibrary(): ProductLibraryResult {
    return {
        items: [],
        linesBySlug: {},
        stylesByLineSlug: {},
        propertyTitles: {},
        facetCatalog: {shared: []},
    };
}

async function fetchSolutionStylesForSolution(
    solutionSlug: string,
): Promise<SolutionStyleCard[]> {
    if (!isSanityConfigured()) return [];
    try {
        const docs = await (await draftAwareClient()).fetch<
            SolutionStyleCardDoc[]
        >(SOLUTION_STYLES_FOR_SOLUTION_QUERY, {solutionSlug});
        return (docs ?? [])
            .map(mapSanitySolutionStyleCard)
            .filter((item): item is SolutionStyleCard => item != null);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error(
                '[solutions] Sanity styles for solution failed:',
                err,
            );
        }
        return [];
    }
}

async function fetchSolutionStylePageParams(): Promise<
    SolutionStylePageParamDoc[]
> {
    if (!isSanityConfigured()) return [];
    try {
        return (
            (await (
                await draftAwareClient()
            ).fetch<SolutionStylePageParamDoc[]>(
                SOLUTION_STYLE_PAGE_PARAMS_QUERY,
            )) ?? []
        );
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error(
                '[solutions] Sanity style page params failed:',
                err,
            );
        }
        return [];
    }
}

async function fetchStyleProductLibrary(
    doc: SolutionStyleBySlugsDoc,
): Promise<ProductLibraryResult> {
    const solutionId = doc.solution?._id;
    if (!solutionId || !isSanityConfigured()) return emptyProductLibrary();

    const params = filterParams(
        solutionId,
        doc.filter ?? undefined,
        doc.excludedProducts ?? undefined,
    );
    const filter = solutionStyleProductFilter(params);
    if (!filter) return emptyProductLibrary();

    try {
        const query = `*[${filter}] | ${SOLUTION_STYLE_ORDER} { ${CATALOG_PRODUCT_LIBRARY_FIELDS} }`;
        const docs = await (await draftAwareClient()).fetch<
            CatalogProductLibraryDoc[]
        >(query, solutionStyleQueryParams(params));

        const items: ProductLibraryItem[] = [];
        const lineMetas: ProductLibraryLineMeta[] = [];
        const propertyTitles: Record<string, string> = {};
        const valueTitles: Record<string, string> = {};
        for (const productDoc of docs ?? []) {
            const mapped = mapSanityProductLibraryItem(productDoc);
            if (mapped) {
                items.push(mapped.item);
                Object.assign(propertyTitles, mapped.propertyTitles);
                Object.assign(valueTitles, mapped.valueTitles);
            }
            const lineMeta = mapSanityProductLibraryLineMeta(productDoc);
            if (lineMeta) lineMetas.push(lineMeta);
        }

        return buildProductLibraryResult(items, lineMetas, {
            omitFacetIds: [PRODUCT_CATALOG_INDUSTRY_FACET_ID],
            propertyTitles,
            valueTitles,
        });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error(
                '[solutions] Sanity style product library failed:',
                err,
            );
        }
        return emptyProductLibrary();
    }
}

async function fetchSolutionStyleCatalog(
    solutionSlug: string,
    styleSlug: string,
): Promise<SolutionStyleCatalog | null> {
    if (!isSanityConfigured()) return null;
    try {
        const doc = await (await draftAwareClient()).fetch<
            SolutionStyleBySlugsDoc | null
        >(SOLUTION_STYLE_BY_SLUGS_QUERY, {solutionSlug, styleSlug});
        if (!doc?.solution?._id || doc.solution.hasPage !== true) return null;

        const style = mapSanitySolutionStylePage(doc);
        const parentSlug = doc.solution.slug?.trim();
        const parentTitle = doc.solution.title?.trim();
        if (!style || !parentSlug || !parentTitle) return null;

        const library = await fetchStyleProductLibrary(doc);
        const shortName =
            doc.solution.shortName?.trim() || parentTitle;

        return {
            solution: {
                slug: parentSlug,
                title: parentTitle,
                shortName,
                allowIndex: doc.solution.allowIndex !== false,
                allowFollow: doc.solution.allowFollow !== false,
            },
            style,
            library,
        };
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error(
                '[solutions] Sanity style catalog failed:',
                err,
            );
        }
        return null;
    }
}

export async function getSolutionStyleCatalog(
    solutionSlug: string,
    styleSlug: string,
): Promise<SolutionStyleCatalog | null> {
    const solutionKey = normalizeSlug(solutionSlug);
    const styleKey = normalizeSlug(styleSlug);

    return readThrough(
        () => fetchSolutionStyleCatalog(solutionKey, styleKey),
        unstable_cache(
            () => fetchSolutionStyleCatalog(solutionKey, styleKey),
            [`${wwwSolutionTag(solutionKey)}:style:${styleKey}`],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_SOLUTIONS_CACHE_TAG, wwwSolutionTag(solutionKey)],
            },
        ),
    );
}

export async function listSolutionStylesForSolution(
    solutionSlug: string,
): Promise<SolutionStyleCard[]> {
    const key = normalizeSlug(solutionSlug);
    return readThrough(
        () => fetchSolutionStylesForSolution(key),
        unstable_cache(
            () => fetchSolutionStylesForSolution(key),
            [`${wwwSolutionTag(key)}:styles`],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_SOLUTIONS_CACHE_TAG, wwwSolutionTag(key)],
            },
        ),
    );
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

export async function listSolutionStylePageParams(): Promise<
    Array<{slug: string; styleSlug: string}>
> {
    const docs = await readThrough(
        fetchSolutionStylePageParams,
        unstable_cache(
            fetchSolutionStylePageParams,
            [WWW_SOLUTIONS_CACHE_TAG, 'style-page-params'],
            {
                revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
                tags: [WWW_SOLUTIONS_CACHE_TAG],
            },
        ),
    );

    return docs
        .map((doc) => {
            const slug = doc.solutionSlug?.trim();
            const styleSlug = doc.styleSlug?.trim();
            if (!slug || !styleSlug) return null;
            return {slug, styleSlug};
        })
        .filter(
            (item): item is {slug: string; styleSlug: string} => item != null,
        );
}
