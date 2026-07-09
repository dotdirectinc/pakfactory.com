"use client";

import { type KeyboardEvent } from "react";
import { cn } from "@pakfactory/ui/lib/utils";
import type { SearchSuggestTab } from "@/lib/algolia-suggest";

export type SearchSuggestTabOption = {
  id: SearchSuggestTab;
  label: string;
};

type SearchSuggestTabsProps = {
  tabs: SearchSuggestTabOption[];
  activeTab: SearchSuggestTab;
  counts: Partial<Record<SearchSuggestTab, number>>;
  onTabChange: (tab: SearchSuggestTab) => void;
  tablistId: string;
  className?: string;
};

function focusTabButton(tablistId: string, tabId: SearchSuggestTab) {
  document.getElementById(`${tablistId}-${tabId}`)?.focus();
}

/**
 * Presentational typeahead tab row (ADR-013 shared core).
 */
export function SearchSuggestTabs({
  tabs,
  activeTab,
  counts,
  onTabChange,
  tablistId,
  className,
}: SearchSuggestTabsProps) {
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (tabs.length === 0) return;

    let nextIndex = activeIndex;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = activeIndex < tabs.length - 1 ? activeIndex + 1 : 0;
        break;
      case "ArrowLeft":
        nextIndex = activeIndex > 0 ? activeIndex - 1 : tabs.length - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    onTabChange(nextTab.id);
    focusTabButton(tablistId, nextTab.id);
  };

  return (
    <div
      role="tablist"
      id={tablistId}
      aria-label="Search result types"
      onKeyDown={handleKeyDown}
      className={cn(
        "flex items-center gap-1 border-b border-border px-2 pt-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const count = counts[tab.id] ?? 0;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${tablistId}-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`${tablistId}-${tab.id}-panel`}
            tabIndex={isActive ? 0 : -1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm transition-colors",
              isActive
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{tab.label}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
