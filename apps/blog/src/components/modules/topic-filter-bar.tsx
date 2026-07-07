import { ChevronDown } from "lucide-react";

/**
 * Figma horizontal filter row for topic detail — UI shell only (wired in Phase 2).
 */
export function TopicFilterBar() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <span className="text-base font-medium text-muted-foreground">
          Filter by
        </span>
        <button
          type="button"
          disabled
          aria-disabled
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-2 text-xs text-muted-foreground"
        >
          Category
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </button>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-base font-medium text-muted-foreground">
          Sort by
        </span>
        <button
          type="button"
          disabled
          aria-disabled
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-2 text-xs text-muted-foreground"
        >
          Newest
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </button>
      </div>
    </div>
  );
}
