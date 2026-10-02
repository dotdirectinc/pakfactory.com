import 'server-only';

import {unstable_cache} from 'next/cache';
import {
    CASE_STUDIES_LISTING_QUERY,
    CASE_STUDIES_PAGE_QUERY,
    CASE_STUDY_BY_SLUG_QUERY,
    type CaseStudiesPageData,
    type CaseStudyCard,
    type CaseStudyDetail,
} from '@pakfactory/sanity/queries';
import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {
    WWW_CASE_STUDIES_CACHE_TAG,
    WWW_CONTENT_REVALIDATE_SECONDS,
} from '@/lib/www-cache';

/**
 * Case-study reads (PROD-2755). One tag for all of them: a detail page shows
 * related studies and the listing shows every card, so any case-study edit
 * can change any of these.
 */
const CACHE_OPTIONS = {
    revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
    tags: [WWW_CASE_STUDIES_CACHE_TAG],
};

function logFailure(what: string, err: unknown) {
    if (process.env.NODE_ENV === 'development') {
        console.error(`[case-studies] Sanity ${what} failed:`, err);
    }
}

async function fetchCaseStudyBySlug(
    slug: string,
): Promise<CaseStudyDetail | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (
            await draftAwareClient()
        ).fetch<CaseStudyDetail | null>(CASE_STUDY_BY_SLUG_QUERY, {slug});
    } catch (err) {
        logFailure('case study by slug', err);
        return null;
    }
}

async function fetchCaseStudiesPage(): Promise<CaseStudiesPageData | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (
            await draftAwareClient()
        ).fetch<CaseStudiesPageData | null>(CASE_STUDIES_PAGE_QUERY);
    } catch (err) {
        logFailure('case studies page', err);
        return null;
    }
}

async function fetchCaseStudyCards(): Promise<CaseStudyCard[]> {
    if (!isSanityConfigured()) return [];
    try {
        return (
            (await (
                await draftAwareClient()
            ).fetch<CaseStudyCard[]>(CASE_STUDIES_LISTING_QUERY)) ?? []
        );
    } catch (err) {
        logFailure('case study cards', err);
        return [];
    }
}

/*
 * `unstable_cache` has no request scope, so `draftAwareClient()` inside it
 * always resolves to the published client: the cached entries are published.
 */
const getCachedCaseStudy = (slug: string) =>
    unstable_cache(
        () => fetchCaseStudyBySlug(slug),
        ['www-case-study', slug],
        CACHE_OPTIONS,
    )();

const getCachedCaseStudiesPage = unstable_cache(
    () => fetchCaseStudiesPage(),
    ['www-case-studies-page'],
    CACHE_OPTIONS,
);

/** Detail document for the page body: drafts in a draft session, cached otherwise. */
export async function getCaseStudy(
    slug: string,
): Promise<CaseStudyDetail | null> {
    return readThrough(
        () => fetchCaseStudyBySlug(slug),
        () => getCachedCaseStudy(slug),
    );
}

/**
 * Published detail for `generateMetadata`, even in draft mode, so stega's
 * invisible characters never reach `<title>`/OG tags. Same cache entry as
 * {@link getCaseStudy}.
 */
export function getPublishedCaseStudy(
    slug: string,
): Promise<CaseStudyDetail | null> {
    return getCachedCaseStudy(slug);
}

/** The `/case-studies` listing page document (hero copy, SEO, OG image). */
export async function getCaseStudiesPage(): Promise<CaseStudiesPageData | null> {
    return readThrough(
        () => fetchCaseStudiesPage(),
        getCachedCaseStudiesPage,
    );
}

/** Published listing page document for `generateMetadata`. */
export function getPublishedCaseStudiesPage(): Promise<CaseStudiesPageData | null> {
    return getCachedCaseStudiesPage();
}

/** Every listing card. */
export async function listCaseStudyCards(): Promise<CaseStudyCard[]> {
    return readThrough(
        () => fetchCaseStudyCards(),
        unstable_cache(
            () => fetchCaseStudyCards(),
            ['www-case-study-cards'],
            CACHE_OPTIONS,
        ),
    );
}
