"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@pakfactory/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@pakfactory/ui/components/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@pakfactory/ui/components/select";

/**
 * Topic detail filter/sort bar (Figma listing header) — the interactive UI +
 * client state. Matches the POC `BlogPostListing` filter row: a rounded-full
 * multiselect Category dropdown + a borderless Sort select.
 *
 * PHASE — FUNCTIONALITY FIRST: this owns the filter state and is fully
 * interactive standalone. Sanity wiring comes next: pass real `categoryOptions`
 * and an `onChange` that pushes the selection into the query/URL so the server
 * re-fetches. Until then it manages state locally and the grid is unfiltered.
 */

export type TopicSort = "newest" | "updated" | "popular";

export type TopicFilters = {
  categories: string[];
  sort: TopicSort;
};

export type CategoryOption = { value: string; label: string };

/** Fallback options when no real `blogCategory` list is passed in (Sanity unconfigured). */
const DEFAULT_CATEGORY_OPTIONS: CategoryOption[] = [
  { value: "packaging-news", label: "Packaging News" },
  { value: "trends", label: "Trends" },
  { value: "business-strategy", label: "Business Strategy" },
  { value: "sustainability", label: "Sustainability" },
  { value: "design-inspiration", label: "Design Inspiration" },
];

/**
 * Sort options mirror the POC labels. Backing status (reconciled at the Sanity step):
 *  - newest  → backed (BLOG_TAG_POSTS_PAGE_NEWEST_QUERY)
 *  - updated → needs a lastModified-ordered query
 *  - popular → blocked until a view-stats source exists (GA/KV)
 */
const SORT_OPTIONS: { value: TopicSort; label: string }[] = [
  { value: "newest", label: "Newest (date posted)" },
  { value: "updated", label: "Recently updated" },
  { value: "popular", label: "Most popular" },
];

type TopicFilterBarProps = {
  categoryOptions?: CategoryOption[];
  /** Fired whenever the selection changes (wire to query/URL at the Sanity step). */
  onChange?: (filters: TopicFilters) => void;
};

export function TopicFilterBar({
  categoryOptions = DEFAULT_CATEGORY_OPTIONS,
  onChange,
}: TopicFilterBarProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<TopicSort>("newest");

  const emit = (next: Partial<TopicFilters>) => {
    onChange?.({ categories, sort, ...next });
  };

  const toggleCategory = (value: string, checked: boolean) => {
    const next = checked
      ? [...categories, value]
      : categories.filter((v) => v !== value);
    setCategories(next);
    emit({ categories: next });
  };

  const clearFilters = () => {
    setCategories([]);
    emit({ categories: [] });
  };

  const handleSort = (value: string) => {
    const nextSort = value as TopicSort;
    setSort(nextSort);
    emit({ sort: nextSort });
  };

  const count = categories.length;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Filter by → Category (multiselect) */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <span className="text-base font-medium text-muted-foreground">
          Filter by
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground",
                "transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              )}
            >
              <span className="flex items-center gap-1.5">
                Category
                {count > 0 && (
                  <span
                    aria-hidden
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium leading-none text-primary-foreground"
                  >
                    {count}
                  </span>
                )}
              </span>
              <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-[320px] min-w-[240px] overflow-y-auto"
          >
            {categoryOptions.map((option) => {
              const selected = categories.includes(option.value);
              return (
                <DropdownMenuItem
                  key={option.value}
                  role="menuitemcheckbox"
                  aria-checked={selected}
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleCategory(option.value, !selected);
                  }}
                  className="flex cursor-pointer items-center justify-between gap-4 pr-2"
                >
                  <span>{option.label}</span>
                  {selected && (
                    <Check className="size-4 shrink-0" aria-hidden />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {count > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Sort by (single select, borderless) */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Sort by</span>
        <Select value={sort} onValueChange={handleSort}>
          <SelectTrigger className="h-9 w-auto gap-1.5 border-0 bg-transparent px-0 text-sm font-medium text-foreground shadow-none focus:ring-0 focus-visible:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
