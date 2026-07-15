"use client";

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

export type FilterOption = { value: string; label: string };

type ListingFilterBarProps = {
  /** Leading label for the filter group (e.g. "Filter by"). */
  filterLabel?: string;
  /** Text shown on the multiselect trigger when nothing is selected (e.g. "Category"). */
  filterTriggerLabel: string;
  filterOptions: FilterOption[];
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
  onClear: () => void;
  /** Leading label for the sort control (e.g. "Sort by"). */
  sortLabel?: string;
  sortOptions: FilterOption[];
  sortValue: string;
  onSortChange: (value: string) => void;
  /** When true, signals an in-flight server navigation (aria-busy + subtle dim). */
  isPending?: boolean;
  className?: string;
};

/**
 * Controlled, presentational filter/sort bar (ADR-013 shared core): a rounded-full
 * multiselect dropdown + a borderless sort select. Owns no data, URL, or feature
 * strings — the parent controller supplies values, options, and change handlers.
 */
export function ListingFilterBar({
  filterLabel = "Filter by",
  filterTriggerLabel,
  filterOptions,
  selected,
  onToggle,
  onClear,
  sortLabel = "Sort by",
  sortOptions,
  sortValue,
  onSortChange,
  isPending = false,
  className,
}: ListingFilterBarProps) {
  const count = selected.length;

  return (
    <div
      aria-busy={isPending || undefined}
      data-pending={isPending || undefined}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        "transition-opacity",
        isPending && "opacity-70",
        className,
      )}
    >
      {/* Filter group (multiselect) */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <span className="text-base font-medium text-muted-foreground">
          {filterLabel}
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
                {filterTriggerLabel}
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
            {filterOptions.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <DropdownMenuItem
                  key={option.value}
                  role="menuitemcheckbox"
                  aria-checked={isSelected}
                  onSelect={(event) => {
                    event.preventDefault();
                    onToggle(option.value, !isSelected);
                  }}
                  className="flex cursor-pointer items-center justify-between gap-4 pr-2"
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="size-4 shrink-0" aria-hidden />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {count > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Sort (single select, borderless) */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{sortLabel}</span>
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger className="h-9 w-auto gap-1.5 border-0 bg-transparent px-0 text-sm font-medium text-foreground shadow-none focus:ring-0 focus-visible:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {sortOptions.map((option) => (
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
