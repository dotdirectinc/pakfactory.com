import { DEFAULT_PAGE_SIZE } from "@/lib/blog-archive";
import { parseListingPage } from "@/lib/seo";

/** Newest (date posted) is the default; the filter bar can re-sort. */
export type SearchSort = "newest" | "updated" | "popular";

export type SearchListFilters = {
  /** Selected category slugs (empty = all). Wired to the URL as repeated `?category=`. */
  categories: string[];
  sort: SearchSort;
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/** Collect a repeated/comma-separated query param into a de-duped, trimmed list. */
function paramList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  const values = raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(values));
}

export function parseSearchQuery(searchParams: SearchParams): string {
  return firstParam(searchParams.q)?.trim() ?? "";
}

export function parseSearchSort(raw: string | undefined): SearchSort {
  if (raw === "updated" || raw === "popular") return raw;
  return "newest";
}

export function parseSearchFilters(searchParams: SearchParams): SearchListFilters {
  return {
    categories: paramList(searchParams.category),
    sort: parseSearchSort(firstParam(searchParams.sort)),
  };
}

export function parseSearchPage(searchParams: SearchParams): number {
  return parseListingPage(searchParams);
}

/**
 * Build a `/search` URL. `q` and active filters are query params; newest
 * sort and page 1 are omitted (defaults). Categories serialize as repeated
 * `?category=` params. Client-safe (no server-only deps).
 */
export function searchPageHref(
  query: string,
  pageNumber: number,
  filters: SearchListFilters,
  perPage?: number,
): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (pageNumber > 1) params.set("page", String(pageNumber));
  for (const slug of filters.categories) params.append("category", slug);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (perPage && perPage !== DEFAULT_PAGE_SIZE) {
    params.set("perPage", String(perPage));
  }
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}
