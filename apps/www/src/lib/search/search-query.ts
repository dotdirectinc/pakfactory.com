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
    'hoverImage',
    'parents',
    // Server-side only (exact-SKU ordering below); not passed to the client.
    'sku',
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

/**
 * `?match=loose` (Basic search, PROD-2525): when every word together finds
 * nothing, Algolia retries with the words optional, so "blue kraft mailer"
 * still returns kraft mailers. Anything else keeps Algolia's default (every
 * word must match, typos and the last word's prefix allowed).
 */
export type SearchMatch = 'default' | 'loose';

export function parseMatch(raw: string | null | undefined): SearchMatch {
    return (raw ?? '').trim().toLowerCase() === 'loose' ? 'loose' : 'default';
}

/**
 * A query shaped like a product SKU (`COR-008`, `cor 008`, `RGD-060-AP2`, or a
 * prefix of one such as `cor-00`), PROD-3136. Every SKU on `development` is
 * `AAA-999` or `AAA-999-AA9`.
 */
const SKU_QUERY = /^[a-z]{2,5}[- ]\d{1,4}(?:[- ][a-z0-9]{1,5})?$/;

export function isSkuQuery(query: string): boolean {
    return SKU_QUERY.test(query);
}

/** `COR-008`, `cor 008` and `cor008` compare equal. */
const compactSku = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * A SKU query is never loosened: dropping words would turn a mistyped SKU into
 * hundreds of loosely related products. Otherwise the requested match applies.
 */
export function effectiveMatch(query: string, requested: SearchMatch): SearchMatch {
    return isSkuQuery(query) ? 'default' : requested;
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
    /** Product `images[1]` when indexed (PROD-3130). */
    hoverImage?: string | null;
    parents: string[];
    /** 1-based rank in Algolia's response, for click events. */
    position: number;
};

export type SearchResponse = {
    query: string;
    filter: SearchFilter;
    total: number;
    /** Facet counts. With a filter they count within that filter only. */
    counts: {group: Record<string, number>; type: Record<string, number>};
    groups: {group: string; hits: SearchHit[]}[];
    /** Algolia queryID (click analytics), null when absent. */
    queryID: string | null;
};

export function emptyResponse(query: string, filter: SearchFilter): SearchResponse {
    return {query, filter, total: 0, counts: {group: {}, type: {}}, groups: [], queryID: null};
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

/**
 * Shape Algolia's response into rail groups, in rail order. Hits without a link
 * are dropped. For a SKU query the product with exactly that SKU goes first:
 * Algolia splits `COR-008` at the hyphen, so `COR-008-BR1` matches it equally
 * and can rank above it (PROD-3136). `position` follows the shown order.
 */
export function shapeResponse(
    query: string,
    filter: SearchFilter,
    result: {
        nbHits?: number;
        queryID?: string;
        hits: RawHit[];
        facets?: Record<string, Record<string, number>>;
    },
    blogUrl: string,
): SearchResponse {
    const byGroup = new Map<string, SearchHit[]>();
    let hits = result.hits;
    if (isSkuQuery(query)) {
        const exact = (raw: RawHit) => compactSku(str(raw.sku)) === compactSku(query);
        hits = [...hits.filter(exact), ...hits.filter((raw) => !exact(raw))];
    }
    for (const [index, raw] of hits.entries()) {
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
            ...(str(raw.hoverImage)
                ? {hoverImage: str(raw.hoverImage)}
                : {}),
            parents: Array.isArray(raw.parents)
                ? raw.parents.filter((p): p is string => typeof p === 'string')
                : [],
            position: index + 1,
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
        queryID: result.queryID ?? null,
        counts: {
            group: result.facets?.group ?? {},
            type: result.facets?.type ?? {},
        },
        groups: order
            .filter((group) => byGroup.has(group))
            .map((group) => ({group, hits: byGroup.get(group)!})),
    };
}

/**
 * The best `limit` hits across all groups, in Algolia's rank order — Basic
 * search's suggestions while typing (PROD-2525). `shapeResponse` regroups hits
 * by tab; `position` keeps the original rank.
 */
export function topHits(data: SearchResponse, limit: number): SearchHit[] {
    return data.groups
        .flatMap((g) => g.hits)
        .sort((a, b) => a.position - b.position)
        .slice(0, limit);
}
