import { ChevronDown } from "lucide-react";

const FILTER_LABELS = ["Topics", "Packaging Type", "Industry"] as const;

/**
 * Figma horizontal filter row — UI shell only in Phase 1 (wired in Phase 2).
 */
export function CategoryFilterBar() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <span className="text-base font-medium text-muted-foreground">
          Filter by
        </span>
        {FILTER_LABELS.map((label) => (
          <button
            key={label}
            type="button"
            disabled
            aria-disabled
            className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-2 text-xs text-muted-foreground"
          >
            {label}
            <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
          </button>
        ))}
        <span className="text-xs text-muted-foreground underline decoration-solid underline-offset-2">
          Clear filters
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <span>Sort:</span>
        <span className="font-medium text-foreground/80">Newest</span>
        <ChevronDown className="size-3.5 opacity-60" aria-hidden />
      </div>
    </div>
  );
}
