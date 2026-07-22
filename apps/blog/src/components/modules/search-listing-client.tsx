"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pagination } from "@pakfactory/components/modules/pagination";
import { scrollToPaginationTarget } from "@pakfactory/components/commons/path-pagination";
import {
  ListingFilterBar,
  type FilterOption,
} from "@/components/ui/listing-filter-bar";
import { LISTING_TOP_ID } from "@/components/modules/pagination";
import { PostList } from "@/components/modules/post-list";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/blog-archive";
import { sitePath } from "@/lib/site";
import {
  parseSearchFilters,
  parseSearchPage,
  searchPageHref,
  type SearchListFilters,
  type SearchSort,
} from "@/lib/blog-search-url";
import {
  resolveListingPage,
  type ListingPost,
} from "@/lib/listing-posts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pakfactory/ui/components/select";

const SEARCH_SORT_OPTIONS: FilterOption[] = [
  { value: "newest", label: "Newest (date posted)" },
  { value: "updated", label: "Recently updated" },
  { value: "popular", label: "Most popular" },
];

function parsePerPageFromSearch(search: string): number {
  const raw = new URLSearchParams(search).get("perPage");
  const n = Number.parseInt(raw ?? "", 10);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? n
    : DEFAULT_PAGE_SIZE;
}

/** Build the SearchParams shape `parseSearchFilters` expects from a query string. */
function searchParamsRecord(
  search: string,
): Record<string, string | string[] | undefined> {
  const params = new URLSearchParams(search);
  const out: Record<string, string | string[] | undefined> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    out[key] = all.length <= 1 ? all[0] : all;
  }
  return out;
}

type SearchListingClientProps = {
  query: string;
  allPosts: ListingPost[];
  categoryOptions: FilterOption[];
  initialFilters: SearchListFilters;
  initialPage: number;
  initialPerPage: number;
};

/**
 * Search results island: category/sort/paginate in memory from `allPosts`
 * (matches for the current `q`). Soft `pushState` updates the URL without an
 * RSC refetch. Changing `q` still navigates for a new server match set.
 */
export function SearchListingClient({
  query,
  allPosts,
  categoryOptions,
  initialFilters,
  initialPage,
  initialPerPage,
}: SearchListingClientProps) {
  const [filters, setFilters] = useState<SearchListFilters>(initialFilters);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [page, setPage] = useState(() => Math.max(1, Math.floor(initialPage)));

  const { pagePosts, totalCount, totalPages } = useMemo(
    () => resolveListingPage(allPosts, filters, page, perPage),
    [allPosts, filters, page, perPage],
  );

  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pushListingUrl = useCallback(
    (nextPage: number, nextFilters: SearchListFilters, nextPerPage: number) => {
      if (typeof window === "undefined") return;
      // `searchPageHref` is base-path-less (correct for next/link, which prefixes
      // basePath); `pushState` is a raw browser API that does NOT, so add the
      // basePath here or the URL would drop `/blog` on every filter/sort change.
      const href = sitePath(searchPageHref(query, nextPage, nextFilters, nextPerPage));
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== href) {
        window.history.pushState(null, "", href);
      }
    },
    [query],
  );

  const syncFromUrl = useCallback(() => {
    const sp = searchParamsRecord(window.location.search);
    setFilters(parseSearchFilters(sp));
    setPage(parseSearchPage(sp));
    setPerPage(parsePerPageFromSearch(window.location.search));
  }, []);

  useEffect(() => {
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [syncFromUrl]);

  const goToPage = (nextPage: number) => {
    const target = Math.max(1, Math.floor(nextPage));
    const changed = target !== page;
    if (changed) setPage(target);
    pushListingUrl(target, filters, perPage);
    if (changed) scrollToPaginationTarget(LISTING_TOP_ID);
  };

  const applyFilters = (next: SearchListFilters) => {
    setFilters(next);
    setPage(1);
    pushListingUrl(1, next, perPage);
  };

  const handleToggle = (value: string, checked: boolean) => {
    const categories = checked
      ? [...filters.categories, value]
      : filters.categories.filter((slug) => slug !== value);
    applyFilters({ ...filters, categories });
  };

  const handlePerPage = (nextSize: number) => {
    setPerPage(nextSize);
    setPage(1);
    pushListingUrl(1, filters, nextSize);
  };

  return (
    <>
      <ListingFilterBar
        filterTriggerLabel="Category"
        filterOptions={categoryOptions}
        selected={filters.categories}
        onToggle={handleToggle}
        onClear={() => applyFilters({ ...filters, categories: [] })}
        sortOptions={SEARCH_SORT_OPTIONS}
        sortValue={filters.sort}
        onSortChange={(value) =>
          applyFilters({ ...filters, sort: value as SearchSort })
        }
      />
      <div
        id={LISTING_TOP_ID}
        className="scroll-mt-24 mt-12 flex flex-col gap-10"
      >
        <PostList
          posts={pagePosts}
          columns={3}
          priorityFirst
          emptyMessage="No posts match your filters for this search."
        />
      </div>
      {totalCount > 0 ? (
        <div className="py-16">
          <Pagination
            pageNumber={safePage}
            totalPages={totalPages}
            onPageChange={goToPage}
            ariaLabel="Search results pagination"
            rightSlot={
              <Select
                value={String(perPage)}
                onValueChange={(v) => handlePerPage(Number(v))}
              >
                <SelectTrigger
                  aria-label="Posts per page"
                  className="h-9 w-[110px] rounded-md border border-border bg-background text-sm text-muted-foreground shadow-none hover:text-foreground"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}/page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </div>
      ) : null}
    </>
  );
}
