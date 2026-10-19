/**
 * `/api/search` request parsing and response shaping (PROD-3110). Pure — no
 * Algolia client, no env — so it is unit-tested directly.
 *
 * Record shape and facet names come from `site_search` (PROD-3109,
 * `packages/sanity/src/algolia/site-search.ts`).
 */

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 80;
export const HITS_PER_PAGE = 30;

/** Rail order in the dialog (PROD-3111). Each is a `group` facet value. */
export const SEARCH_GROUPS = [
    'products',
    'solutions',
    'customizations',
    'guides',
    'resources',
] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];

export const SEARCH_TYPES = [
    'product',
    'product-line',
    'product-style',
    'customization',
    'solution',
    'solution-style',
    'guide',
    'case-study',
    'expertise',
    'press-release',
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

/** Fields the response carries; everything else stays in Algolia. */
export const RETRIEVED_ATTRIBUTES = [
    'type',
    'group',
    'kind',
    'title',
    'href',
    'summary',
    'image',
    'imageAlt',
    'parents',
] as const;

/**
 * Lower-case, collapse whitespace, cap the length. Repeat queries that differ
 * only in case or spacing then share one CDN cache entry and one Algolia call.
 */
export function normalizeQuery(raw: string | null | undefined): string {
    return (raw ?? '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_QUERY_LENGTH)
        .trim();
}

export type SearchFilter =
    | {facet: 'group'; value: SearchGroup}
    | {facet: 'type'; value: SearchType}
    | null;

/** `?type=` accepts a rail tab (`group`) or a single record type. Unknown → no filter. */
export function parseTypeFilter(raw: string | null | undefined): SearchFilter {
    const value = (raw ?? '').trim().toLowerCase();
    if ((SEARCH_GROUPS as readonly string[]).includes(value)) {
        return {facet: 'group', value: value as SearchGroup};
    }
    if ((SEARCH_TYPES as readonly string[]).includes(value)) {
        return {facet: 'type', value: value as SearchType};
    }
    return null;
}

export type SearchHit = {
    id: string;
    type: string;
    group: string;
    kind: string | null;
    title: string;
    href: string;
    summary: string;
    image: string | null;
    imageAlt: string;
    parents: string[];
};

export type SearchResponse = {
    query: string;
    filter: SearchFilter;
    total: number;
    /** Facet counts. With a filter they count within that filter only. */
    counts: {group: Record<string, number>; type: Record<string, number>};
    groups: {group: string; hits: SearchHit[]}[];
};

export function emptyResponse(query: string, filter: SearchFilter): SearchResponse {
    return {query, filter, total: 0, counts: {group: {}, type: {}}, groups: []};
}

type RawHit = {objectID: string} & Partial<Record<string, unknown>>;

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Guides live on the blog app. `site_search` stores `/blog/{slug}`; the blog's
 * origin differs per environment (staging: staging-blog.pakfactory.com), so the
 * prefix is swapped for `blogUrl` here — `https://…/blog` with no trailing slash.
 */
export function resolveHref(href: string, blogUrl: string): string {
    if (href === '/blog' || href.startsWith('/blog/')) {
        return `${blogUrl.replace(/\/+$/, '')}${href.slice('/blog'.length)}`;
    }
    return href;
}

/** Shape Algolia's response into rail groups, in rail order. Hits without a link are dropped. */
export function shapeResponse(
    query: string,
    filter: SearchFilter,
    result: {
        nbHits?: number;
        hits: RawHit[];
        facets?: Record<string, Record<string, number>>;
    },
    blogUrl: string,
): SearchResponse {
    const byGroup = new Map<string, SearchHit[]>();
    for (const raw of result.hits) {
        const href = str(raw.href);
        const title = str(raw.title);
        if (!href || !title) continue;
        const hit: SearchHit = {
            id: raw.objectID,
            type: str(raw.type),
            group: str(raw.group),
            kind: str(raw.kind) || null,
            title,
            href: resolveHref(href, blogUrl),
            summary: str(raw.summary),
            image: str(raw.image) || null,
            imageAlt: str(raw.imageAlt),
            parents: Array.isArray(raw.parents)
                ? raw.parents.filter((p): p is string => typeof p === 'string')
                : [],
        };
        const list = byGroup.get(hit.group) ?? [];
        list.push(hit);
        byGroup.set(hit.group, list);
    }
    const order = [
        ...SEARCH_GROUPS,
        ...[...byGroup.keys()].filter((g) => !(SEARCH_GROUPS as readonly string[]).includes(g)),
    ];
    return {
        query,
        filter,
        total: result.nbHits ?? 0,
        counts: {
            group: result.facets?.group ?? {},
            type: result.facets?.type ?? {},
        },
        groups: order
            .filter((group) => byGroup.has(group))
            .map((group) => ({group, hits: byGroup.get(group)!})),
    };
}
