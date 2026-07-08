"use client";

import { useRouter } from "next/navigation";
import {
  ListingFilterBar,
  type FilterOption,
} from "@/components/ui/listing-filter-bar";
import {
  searchPageHref,
  type SearchListFilters,
  type SearchSort,
} from "@/lib/blog-search";

const SEARCH_SORT_OPTIONS: FilterOption[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "Title A–Z" },
];

type SearchFilterBarProps = {
  query: string;
  filters: SearchListFilters;
  categoryOptions: FilterOption[];
};

/**
 * Search feature controller (ADR-013): composes the shared `ListingFilterBar`
 * and owns the URL wiring — every change resets to page 1 and pushes
 * `searchPageHref(...)` so the server re-fetches with the new filters.
 */
export function SearchFilterBar({
  query,
  filters,
  categoryOptions,
}: SearchFilterBarProps) {
  const router = useRouter();

  const go = (next: SearchListFilters) => {
    router.push(searchPageHref(query, 1, next));
  };

  const handleToggle = (value: string, checked: boolean) => {
    const categories = checked
      ? [...filters.categories, value]
      : filters.categories.filter((slug) => slug !== value);
    go({ ...filters, categories });
  };

  return (
    <ListingFilterBar
      filterTriggerLabel="Category"
      filterOptions={categoryOptions}
      selected={filters.categories}
      onToggle={handleToggle}
      onClear={() => go({ ...filters, categories: [] })}
      sortOptions={SEARCH_SORT_OPTIONS}
      sortValue={filters.sort}
      onSortChange={(value) => go({ ...filters, sort: value as SearchSort })}
    />
  );
}
