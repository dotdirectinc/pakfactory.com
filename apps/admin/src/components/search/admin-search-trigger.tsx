"use client";

import { Search } from "lucide-react";
import { useAdminSearch } from "@/components/search/admin-search-provider";

export function AdminSearchTrigger({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { setOpen } = useAdminSearch();

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-8 items-center justify-center rounded-md bg-background/10 text-background/70 transition-colors hover:bg-background/15 hover:text-background"
        aria-label="Search"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Search className="size-4 opacity-80" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-8 w-full items-center gap-2 rounded-md bg-background/10 px-2 text-sm text-background/60 transition-colors hover:bg-background/15 hover:text-background/80"
      aria-label="Search"
      aria-keyshortcuts="Meta+K Control+K"
    >
      <Search className="size-4 shrink-0 opacity-70" aria-hidden />
      <span className="truncate">Search</span>
      <kbd className="ml-auto hidden rounded border border-background/20 px-1.5 py-1 font-mono text-[10px] text-background/50 md:inline">
        ⌘K
      </kbd>
    </button>
  );
}
