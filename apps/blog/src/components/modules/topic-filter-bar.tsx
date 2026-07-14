"use client";

import { useRouter } from "next/navigation";
import {
  ListingFilterBar,
  type FilterOption,
} from "@/components/ui/listing-filter-bar";
import {
  tagPageHref,
  type TagListFilters,
  type TagSort,
} from "@/lib/blog-tag-archive";

export type CategoryOption = FilterOption;

const TOPIC_SORT_OPTIONS: FilterOption[] = [
  { value: "newest", label: "Newest (date posted)" },
  { value: "updated", label: "Recently updated" },
  { value: "popular", label: "Most popular" },
];

type TopicFilterBarProps = {
  tagSlug: string;
  filters: TagListFilters;
  categoryOptions: CategoryOption[];
  perPage: number;
};

/**
 * Topic archive feature controller (ADR-013): composes the shared `ListingFilterBar`
 * and owns the URL wiring — every change resets to page 1 and pushes
 * `tagPageHref(...)` so the server re-fetches with the new filters.
 */
export function TopicFilterBar({
  tagSlug,
  filters,
  categoryOptions,
  perPage,
}: TopicFilterBarProps) {
  const router = useRouter();

  const go = (next: TagListFilters) => {
    router.push(tagPageHref(tagSlug, 1, next, perPage));
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
      sortOptions={TOPIC_SORT_OPTIONS}
      sortValue={filters.sort}
      onSortChange={(value) => go({ ...filters, sort: value as TagSort })}
    />
  );
}
