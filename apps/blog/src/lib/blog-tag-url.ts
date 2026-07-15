import { DEFAULT_PAGE_SIZE } from "@/lib/blog-archive";

export type TagSort = "newest" | "updated" | "popular";

/**
 * Tag is the page itself, so it is not a filter — author/date/category/sort
 * narrow the set. Client-safe (no server-only deps).
 */
export type TagListFilters = {
  categories: string[];
  author?: string;
  year?: string;
  month?: string;
  sort: TagSort;
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

export function parseTagSort(raw: string | undefined): TagSort {
  if (raw === "updated" || raw === "popular") return raw;
  return "newest";
}

export function parseTagFilters(searchParams: SearchParams): TagListFilters {
  return {
    categories: paramList(searchParams.category),
    author: firstParam(searchParams.author)?.trim() || undefined,
    year: firstParam(searchParams.year)?.trim() || undefined,
    month: firstParam(searchParams.month)?.trim() || undefined,
    sort: parseTagSort(firstParam(searchParams.sort)),
  };
}

export function tagPageHref(
  tagSlug: string,
  pageNumber: number,
  filters: TagListFilters,
  perPage?: number,
): string {
  const base =
    pageNumber <= 1 ? `/topics/${tagSlug}` : `/topics/${tagSlug}/page/${pageNumber}`;
  const params = new URLSearchParams();
  for (const slug of filters.categories) params.append("category", slug);
  if (filters.author) params.set("author", filters.author);
  if (filters.year) params.set("year", filters.year);
  if (filters.month) params.set("month", filters.month);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (perPage && perPage !== DEFAULT_PAGE_SIZE) {
    params.set("perPage", String(perPage));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
