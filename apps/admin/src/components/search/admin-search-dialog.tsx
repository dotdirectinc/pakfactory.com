"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@pakfactory/ui/components/dialog";
import { Input } from "@pakfactory/ui/components/input";
import { useAdminSearch } from "@/components/search/admin-search-provider";
import { AdminSearchFacets } from "@/components/search/admin-search-facets";
import { AdminSearchRail } from "@/components/search/admin-search-rail";
import { AdminSearchResults } from "@/components/search/admin-search-results";
import {
  clearSearchRecents,
  pushSearchRecent,
  readSearchRecents,
  type AdminSearchRecent,
} from "@/lib/search/recents";
import { ADMIN_SEARCH_PAGES } from "@/lib/search/pages";
import { facetLabel } from "@/lib/search/scopes";
import type {
  AdminSearchFacet,
  AdminSearchHit,
  AdminSearchResponse,
  AdminSearchSection,
} from "@/lib/search/types";
import { isNarrowingScope } from "@/lib/search/types";

const DEBOUNCE_MS = 250;

export function AdminSearchDialog() {
  const router = useRouter();
  const { open, setOpen, query, setQuery, scope, setScope } = useAdminSearch();
  const [recents, setRecents] = useState<AdminSearchRecent[]>([]);
  const [sections, setSections] = useState<AdminSearchSection[]>([]);
  const [facets, setFacets] = useState<AdminSearchFacet[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const hasQuery = Boolean(query.trim());
  /** Mobbin left-rail body only while idle; typing switches to Shopify pills. */
  const idle = !hasQuery;

  const idleRequests = useMemo(() => {
    if (!idle) return [];
    return sections.find((s) => s.id === "requests")?.hits ?? [];
  }, [idle, sections]);

  const flatHits = useMemo(() => {
    if (idle) {
      if (scope === "all") {
        return [
          ...idleRequests,
          ...ADMIN_SEARCH_PAGES.filter((p) => p.id !== "page-settings"),
        ];
      }
      return sections.flatMap((s) => s.hits);
    }
    return sections.flatMap((s) => s.hits);
  }, [idle, scope, sections, idleRequests]);

  const scopedLabel =
    !idle && isNarrowingScope(scope) ? facetLabel(scope) : undefined;

  useEffect(() => {
    if (!open) return;
    setRecents(readSearchRecents());
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const q = query.trim();
    setLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            scope,
          }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as AdminSearchResponse;
        setSections(data.sections);
        setFacets(data.facets ?? []);
        setActiveIndex(0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSections([]);
          setFacets([]);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query, scope]);

  const selectHit = (hit: AdminSearchHit) => {
    if (query.trim()) {
      setRecents(pushSearchRecent(query));
    }
    setOpen(false);
    if (!hit.external) {
      router.push(hit.href);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatHits.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      const hit = flatHits[activeIndex];
      if (hit) {
        event.preventDefault();
        if (hit.external) {
          window.open(hit.href, "_blank", "noopener,noreferrer");
        }
        selectHit(hit);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setActiveIndex(0);
          setScope("all");
          setQuery("");
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={
          idle
            ? "top-2 left-1/2 flex max-h-[min(720px,calc(100dvh-1rem))] w-full max-w-3xl origin-top translate-x-[-50%] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
            : "top-2 left-1/2 flex max-h-[min(720px,calc(100dvh-1rem))] w-full max-w-xl origin-top translate-x-[-50%] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        }
        onKeyDown={onKeyDown}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search requests, products, customizations, blog posts, and case
          studies.
        </DialogDescription>

        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          {scopedLabel ? (
            <button
              type="button"
              onClick={() => setScope("all")}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
              aria-label={`Clear ${scopedLabel} filter`}
            >
              {scopedLabel}
              <X className="size-3 opacity-70" aria-hidden />
            </button>
          ) : null}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              scopedLabel
                ? `Search in ${scopedLabel}…`
                : "Search requests, products, blogs…"
            }
            className="h-10 min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            aria-autocomplete="list"
            aria-controls="admin-search-results"
            autoFocus
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
              }}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : (
            <kbd className="hidden rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
              esc
            </kbd>
          )}
        </div>

        {/* Typing only: Shopify suggestion pills */}
        {!idle ? (
          <AdminSearchFacets
            facets={facets}
            scope={scope}
            onSelect={(next) => setScope(next)}
          />
        ) : null}

        <div
          id="admin-search-results"
          className={
            idle
              ? "flex min-h-[320px] min-w-0 flex-1 flex-col gap-3 p-3 md:flex-row"
              : "min-h-[280px] min-w-0 flex-1"
          }
        >
          {/* Idle only: Mobbin left rail */}
          {idle ? (
            <AdminSearchRail scope={scope} onScopeChange={setScope} />
          ) : null}

          <div
            className={
              idle
                ? "min-h-0 min-w-0 flex-1 border-t pt-3 md:border-t-0 md:border-l md:pl-3 md:pt-0"
                : "min-h-0 min-w-0 flex-1"
            }
          >
            {loading && !idle ? (
              <p className="px-4 py-2 text-sm text-muted-foreground">
                Searching…
              </p>
            ) : null}
            <AdminSearchResults
              sections={sections}
              activeIndex={activeIndex}
              flatHits={flatHits}
              onSelect={selectHit}
              emptyQuery={idle}
              recentQueries={recents}
              onRecentClick={setQuery}
              onClearRecents={() => {
                clearSearchRecents();
                setRecents([]);
              }}
              recentRequests={idleRequests}
              query={query.trim()}
              scopedLabel={scopedLabel}
              idleScope={idle ? scope : undefined}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
