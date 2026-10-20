import 'server-only';

import {
    SITE_SEARCH_FILTER,
    SITE_SEARCH_PROJECTION,
    type SiteSearchRecord,
} from '@pakfactory/sanity/algolia/site-search';

import {draftAwareClient, readThrough} from '@/lib/sanity/draft-aware';
import {isSanityConfigured} from '@/lib/sanity/env';
import {sanityCache, sanityReadFailed} from '@/lib/sanity/sanity-cache';
import {
    WWW_CASE_STUDIES_CACHE_TAG,
    WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG,
    WWW_CATALOG_LINES_CACHE_TAG,
    WWW_CATALOG_PRODUCTS_CACHE_TAG,
    WWW_CONTENT_REVALIDATE_SECONDS,
    WWW_EXPERTISE_CACHE_TAG,
    WWW_NEWSROOM_CACHE_TAG,
    WWW_SOLUTIONS_CACHE_TAG,
} from '@/lib/www-cache';
import {BLOG_URL} from '@/lib/www-nav';

import {
    pickCustomizations,
    pickProductLines,
    pickProducts,
    type BrowseLine,
    toBrowseItems,
    type SearchBrowseData,
} from './search-browse-picks';

export type {BrowseItem, SearchBrowseData} from './search-browse-picks';

/**
 * What each rail tab shows before anything is typed (PROD-3111). Rule-based
 * picks, so the tabs are never empty and need no editor upkeep; a later ticket
 * swaps in the most-clicked item per slot once Algolia click data is there
 * (clicks are recorded from day one, `/api/search/click`).
 *
 * | Tab            | Rule |
 * | Products       | the 8 lines with the most products → each line's first product with an image (test fixtures skipped) |
 * | Solutions      | every solution with a page |
 * | Customizations | category pills (filtered catalog) + the first 2 options with a page per category |
 * | Guides         | the 4 newest blog posts |
 * | Resources      | the 4 newest case studies, the newest press release, the expertise stages |
 *
 * Everything is read with the `site_search` filter and projection, so links,
 * images and visibility are exactly what search results show — no products
 * hidden from search, no QA fixtures with `allowIndex` off. Cached Sanity only:
 * opening the dialog never calls Algolia.
 */

type BrowseQueryResult = {
    solutions: SiteSearchRecord[];
    customizations: SiteSearchRecord[];
    guides: SiteSearchRecord[];
    caseStudies: SiteSearchRecord[];
    pressReleases: SiteSearchRecord[];
    expertise: SiteSearchRecord[];
    lines: BrowseLine[];
};

const byType = (type: string) => `*[_type == "${type}" && ${SITE_SEARCH_FILTER}]`;

const SEARCH_BROWSE_QUERY = /* groq */ `{
  "solutions": ${byType('solution')} | order(title asc) ${SITE_SEARCH_PROJECTION},
  "customizations": ${byType('customizationOption')} | order(title asc) ${SITE_SEARCH_PROJECTION},
  "guides": ${byType('post')} | order(publishedAt desc) [0...4] ${SITE_SEARCH_PROJECTION},
  "caseStudies": ${byType('caseStudy')} | order(publishedAt desc) [0...4] ${SITE_SEARCH_PROJECTION},
  "pressReleases": ${byType('pressRelease')} | order(publishedAt desc) [0...1] ${SITE_SEARCH_PROJECTION},
  "expertise": ${byType('expertiseStage')} ${SITE_SEARCH_PROJECTION},
  "lines": ${byType('productLine')} | order(title asc) {
    "record": @${SITE_SEARCH_PROJECTION},
    shortName,
    "productCount": count(*[_type == "product" && productLine._ref == ^._id && ${SITE_SEARCH_FILTER}]),
    "firstProduct": *[_type == "product" && productLine._ref == ^._id && defined(images[0].asset) && ${SITE_SEARCH_FILTER}] | order(title asc) [0] ${SITE_SEARCH_PROJECTION}
  }
}`;

async function fetchBrowseRecords(): Promise<BrowseQueryResult | null> {
    if (!isSanityConfigured()) return null;
    try {
        return await (await draftAwareClient()).fetch<BrowseQueryResult>(SEARCH_BROWSE_QUERY);
    } catch (err) {
        throw sanityReadFailed('[search] Sanity browse records failed:', err);
    }
}

const getCachedBrowseRecords = sanityCache(fetchBrowseRecords, ['www-search-browse-v3'], {
    revalidate: WWW_CONTENT_REVALIDATE_SECONDS,
    tags: [
        WWW_SOLUTIONS_CACHE_TAG,
        WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG,
        WWW_CATALOG_LINES_CACHE_TAG,
        WWW_CATALOG_PRODUCTS_CACHE_TAG,
        WWW_CASE_STUDIES_CACHE_TAG,
        WWW_NEWSROOM_CACHE_TAG,
        WWW_EXPERTISE_CACHE_TAG,
    ],
});

export async function getSearchBrowseData(): Promise<SearchBrowseData> {
    const records = await readThrough(fetchBrowseRecords, getCachedBrowseRecords);
    const {categories, options} = pickCustomizations(records?.customizations ?? [], BLOG_URL);
    return {
        productLines: pickProductLines(records?.lines ?? []),
        products: pickProducts(records?.lines ?? [], BLOG_URL),
        solutions: toBrowseItems(records?.solutions, BLOG_URL),
        customizationCategories: categories,
        customizations: options,
        guides: toBrowseItems(records?.guides, BLOG_URL),
        caseStudies: toBrowseItems(records?.caseStudies, BLOG_URL),
        pressReleases: toBrowseItems(records?.pressReleases, BLOG_URL),
        expertise: toBrowseItems(records?.expertise, BLOG_URL),
    };
}
