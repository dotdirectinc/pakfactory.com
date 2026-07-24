"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pagination } from "@pakfactory/components/modules/pagination";
import {
  parsePathPage,
  scrollToPaginationTarget,
} from "@pakfactory/components/commons/path-pagination";
import {
  ListingFilterBar,
  type FilterOption,
} from "@/components/ui/listing-filter-bar";
import { LISTING_TOP_ID } from "@/components/modules/pagination";
import { PostList } from "@/components/modules/post-list";
import { TopicLandingSection } from "@/components/views/topic-landing-layout";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/blog-archive";
import { sitePath } from "@/lib/site";
import {
  tagPageHref,
  type TagListFilters,
  type TagSort,
} from "@/lib/blog-tag-url";
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

const TOPIC_SORT_OPTIONS: FilterOption[] = [
  { value: "newest", label: "Newest (date posted)" },
  { value: "updated", label: "Recently updated" },
  { value: "popular", label: "Most popular" },
];

function parseFiltersFromSearch(search: string): TagListFilters {
  const params = new URLSearchParams(search);
  const categories = Array.from(
    new Set(
      params
        .getAll("category")
        .flatMap((entry) => entry.split(","))
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
  const sortRaw = params.get("sort");
  const sort: TagSort =
    sortRaw === "updated" || sortRaw === "popular" ? sortRaw : "newest";
  return {
    categories,
    author: params.get("author")?.trim() || undefined,
    year: params.get("year")?.trim() || undefined,
    month: params.get("month")?.trim() || undefined,
    sort,
  };
}

function parsePerPageFromSearch(search: string): number {
  const raw = new URLSearchParams(search).get("perPage");
  const n = Number.parseInt(raw ?? "", 10);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? n
    : DEFAULT_PAGE_SIZE;
}

type TopicListingClientProps = {
  tagSlug: string;
  allPosts: ListingPost[];
  categoryOptions: FilterOption[];
  initialFilters: TagListFilters;
  initialPage: number;
  initialPerPage: number;
};

/**
 * Topic listing island: filter/sort/paginate in memory from `allPosts` so
 * cards update instantly. Soft `pushState` keeps the URL shareable without an
 * RSC refetch (same pattern as www case-studies).
 */
export function TopicListingClient({
  tagSlug,
  allPosts,
  categoryOptions,
  initialFilters,
  initialPage,
  initialPerPage,
}: TopicListingClientProps) {
  const basePath = `/topics/${tagSlug}`;
  const [filters, setFilters] = useState<TagListFilters>(initialFilters);
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
    (nextPage: number, nextFilters: TagListFilters, nextPerPage: number) => {
      if (typeof window === "undefined") return;
      // `tagPageHref` is base-path-less (correct for next/link, which prefixes
      // basePath); `pushState` is a raw browser API that does NOT, so add the
      // basePath here or the URL would drop `/blog` on every filter/sort change.
      const href = sitePath(tagPageHref(tagSlug, nextPage, nextFilters, nextPerPage));
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== href) {
        window.history.pushState(null, "", href);
      }
    },
    [tagSlug],
  );

  const syncFromUrl = useCallback(() => {
    const parsed = parsePathPage(window.location.pathname, basePath);
    if (parsed != null) setPage(parsed);
    setFilters(parseFiltersFromSearch(window.location.search));
    setPerPage(parsePerPageFromSearch(window.location.search));
  }, [basePath]);

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

  const applyFilters = (next: TagListFilters) => {
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
    <TopicLandingSection>
      <ListingFilterBar
        filterTriggerLabel="Category"
        filterOptions={categoryOptions}
        selected={filters.categories}
        onToggle={handleToggle}
        onClear={() => applyFilters({ ...filters, categories: [] })}
        sortOptions={TOPIC_SORT_OPTIONS}
        sortValue={filters.sort}
        onSortChange={(value) =>
          applyFilters({ ...filters, sort: value as TagSort })
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
          emptyMessage="No posts match your filters for this topic."
        />
      </div>
      {totalCount > 0 ? (
        <div className="py-8 md:py-16">
          <Pagination
            pageNumber={safePage}
            totalPages={totalPages}
            onPageChange={goToPage}
            ariaLabel="Topic archive pagination"
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
    </TopicLandingSection>
  );
}
