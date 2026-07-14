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
      /** True when a non-default `?perPage=` is active (duplicate-content variant). */
      hasNonDefaultPerPage?: boolean;
    };

/**
 * Query params that narrow a listing beyond default sort/pagination.
 * `page` is intentionally excluded — pagination uses page number, not filter state.
 * `perPage` is handled separately (non-default sizes are treated as paginated variants).
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
 * True when `?perPage=` is present and not the default listing size.
 * Non-default page sizes are duplicate-content variants → noindex.
 */
export function hasNonDefaultPerPage(
  searchParams: SearchParams,
  defaultPerPage = 15,
): boolean {
  const raw = firstParam(searchParams.perPage);
  if (raw === undefined || raw.trim() === "") return false;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return false;
  return n !== defaultPerPage;
}

/**
 * Robots policy for blog routes (PROD-1495).
 *
 * - Post detail: always index, follow.
 * - Listing page 1, no filters, default per-page: index, follow.
 * - Listing page 2+, filtered state, or non-default per-page: noindex, follow.
 */
export function getBlogRobotsDirective(input: BlogRobotsInput): BlogRobotsDirective {
  if (input.kind === "post") {
    return { index: true, follow: true };
  }

  if (input.kind === "error") {
    return { index: false, follow: true };
  }

  const pageNumber = input.pageNumber ?? 1;
  if (
    input.hasActiveFilters ||
    input.hasNonDefaultPerPage ||
    pageNumber > 1
  ) {
    return { index: false, follow: true };
  }

  return { index: true, follow: true };
}

/**
 * Global indexing kill-switch. When `BLOG_DISABLE_INDEXING` is truthy, every
 * blog page is forced to `noindex, nofollow` regardless of the per-document or
 * rule-based directive — so non-production origins (e.g. the `*.vercel.app`
 * preview) are never indexed. Set it in the environment of any deploy that must
 * stay out of search results; leave it unset in production.
 */
export function isBlogIndexingDisabled(): boolean {
  const v = process.env.BLOG_DISABLE_INDEXING?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function robotsDirectiveToMetadata(
  directive: BlogRobotsDirective,
): NonNullable<Metadata["robots"]> {
  if (isBlogIndexingDisabled()) {
    return { index: false, follow: false, nocache: true, noimageindex: true };
  }
  return {
    index: directive.index,
    follow: directive.follow,
    ...(directive.noImageIndex ? { noimageindex: true } : {}),
  };
}

/** Robots for `/all` archive (path-based pagination, PROD-1498). */
export function getAllArchiveRobots(
  pageNumber: number,
  options?: { hasNonDefaultPerPage?: boolean },
): BlogRobotsDirective {
  return getBlogRobotsDirective({
    kind: "all_archive",
    pageNumber,
    hasActiveFilters: false,
    hasNonDefaultPerPage: options?.hasNonDefaultPerPage,
  });
}

/**
 * Robots for `/topics/{slug}` archives (PROD-1500). Like other listings, but an
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
        hasNonDefaultPerPage: hasNonDefaultPerPage(searchParams),
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
    hasNonDefaultPerPage: hasNonDefaultPerPage(searchParams),
  });
}
