"use client";

import { cn } from "@pakfactory/ui/lib/utils";
import type { AdminSearchFacet, AdminSearchScope } from "@/lib/search/types";
import { isNarrowingScope } from "@/lib/search/types";

export function AdminSearchFacets({
  facets,
  scope,
  onSelect,
}: {
  facets: AdminSearchFacet[];
  scope: AdminSearchScope;
  onSelect: (facetId: AdminSearchFacet["id"] | "all") => void;
}) {
  if (facets.length === 0) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto px-3 pb-2 pt-1"
      role="listbox"
      aria-label="Narrow results by type"
    >
      {facets.map((facet) => {
        const selected = isNarrowingScope(scope) && scope === facet.id;
        return (
          <button
            key={facet.id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onSelect(selected ? "all" : facet.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
              selected
                ? "border-foreground/20 bg-muted font-medium text-foreground"
                : "border-transparent bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{facet.label}</span>
            <span className="tabular-nums text-xs opacity-70">{facet.count}</span>
          </button>
        );
      })}
    </div>
  );
}
