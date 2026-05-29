import type { Metadata } from "next";

/** Listing archive types that share pagination / filter robots rules. */
export type BlogListingKind =
  | "blog_index"
  | "all_archive"
  | "category"
  | "tag"
  | "author";

export type BlogRobotsDirective = {
  index: boolean;
  follow: boolean;
  noImageIndex?: boolean;
};

/** Per-document SEO overrides that layer on top of the rule-based directive. */
export type DocSeoOverrides = {
  allowIndex?: boolean;
  allowFollow?: boolean;
  noImageIndex?: boolean;
};

export type BlogRobotsInput =
  | { kind: "post" }
  | { kind: "error" }
  | {
      kind: BlogListingKind;
      /** 1-based page number. Defaults to 1. */
      pageNumber?: number;
      /** True when URL query changes the result set (not pagination alone). */
      hasActiveFilters?: boolean;
    };

/**
 * Query params that narrow a listing beyond default sort/pagination.
 * `page` is intentionally excluded — pagination uses page number, not filter state.
 */
export const LISTING_FILTER_QUERY_KEYS = [
  "tag",
  "category",
  "q",
  "query",
  "author",
  "year",
  "month",
] as const;

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/** Parse `?page=` (or future path segment) into a 1-based page number. */
export function parseListingPage(searchParams: SearchParams): number {
  const raw = firstParam(searchParams.page);
  if (raw === undefined || raw.trim() === "") return 1;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

/** True when any listing filter query param is present and non-empty. */
export function hasListingFilters(searchParams: SearchParams): boolean {
  for (const key of LISTING_FILTER_QUERY_KEYS) {
    const value = firstParam(searchParams[key]);
    if (value !== undefined && value.trim() !== "") return true;
  }
  return false;
}

/**
 * Robots policy for blog routes (PROD-1495).
 *
 * - Post detail: always index, follow.
 * - Listing page 1, no filters: index, follow.
 * - Listing page 2+, or any filtered state: noindex, follow.
 */
export function getBlogRobotsDirective(input: BlogRobotsInput): BlogRobotsDirective {
  if (input.kind === "post") {
    return { index: true, follow: true };
  }

  if (input.kind === "error") {
    return { index: false, follow: true };
  }

  const pageNumber = input.pageNumber ?? 1;
  if (input.hasActiveFilters || pageNumber > 1) {
    return { index: false, follow: true };
  }

  return { index: true, follow: true };
}

export function robotsDirectiveToMetadata(
  directive: BlogRobotsDirective,
): NonNullable<Metadata["robots"]> {
  return {
    index: directive.index,
    follow: directive.follow,
    ...(directive.noImageIndex ? { noimageindex: true } : {}),
  };
}

/** Robots for `/all` archive (path-based pagination, PROD-1498). */
export function getAllArchiveRobots(pageNumber: number): BlogRobotsDirective {
  return getBlogRobotsDirective({
    kind: "all_archive",
    pageNumber,
    hasActiveFilters: false,
  });
}

/**
 * Robots for `/tag/{slug}` archives (PROD-1500). Like other listings, but an
 * **empty** tag (no published posts) is `noindex` even on page 1 to avoid
 * indexing thin/empty pages.
 */
export function getTagListingRobots(
  pageNumber: number,
  searchParams: SearchParams,
  hasPosts: boolean,
  tag?: DocSeoOverrides,
): BlogRobotsDirective {
  const base = !hasPosts
    ? { index: false, follow: true }
    : getBlogRobotsDirective({
        kind: "tag",
        pageNumber,
        hasActiveFilters: hasListingFilters(searchParams),
      });

  // Per-tag overrides only tighten: tags default to noindex unless explicitly
  // opted in (spec § 4); follow defaults ON; noImageIndex defaults OFF.
  const allowIndex = tag?.allowIndex === true;
  const allowFollow = tag?.allowFollow !== false;
  const noImageIndex = tag?.noImageIndex === true;

  return {
    index: base.index && allowIndex,
    follow: base.follow && allowFollow,
    ...(noImageIndex ? { noImageIndex: true } : {}),
  };
}

/** Build listing robots from Next.js `searchParams` on archive routes. */
export function getListingRobotsFromSearchParams(
  kind: BlogListingKind,
  searchParams: SearchParams,
): BlogRobotsDirective {
  return getBlogRobotsDirective({
    kind,
    pageNumber: parseListingPage(searchParams),
    hasActiveFilters: hasListingFilters(searchParams),
  });
}
