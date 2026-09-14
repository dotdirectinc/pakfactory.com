"use client";

import Link from "next/link";
import {
  BookOpen,
  Boxes,
  FileText,
  Home,
  Package,
  Search,
} from "lucide-react";
import { Badge } from "@pakfactory/ui/components/badge";
import { cn } from "@pakfactory/ui/lib/utils";
import type {
  AdminSearchHit,
  AdminSearchHitKind,
  AdminSearchSection,
} from "@/lib/search/types";

const KIND_ICON: Record<AdminSearchHitKind, typeof Search> = {
  request: FileText,
  product: Package,
  customization: Boxes,
  post: BookOpen,
  caseStudy: BookOpen,
  page: Home,
};

function HitRow({
  hit,
  active,
  onSelect,
}: {
  hit: AdminSearchHit;
  active: boolean;
  onSelect: (hit: AdminSearchHit) => void;
}) {
  const Icon = KIND_ICON[hit.kind] ?? Search;
  const className = cn(
    "flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors",
    active ? "bg-muted" : "hover:bg-muted/60",
  );

  const body = (
    <>
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {hit.title}
          </span>
          {hit.badge ? (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {hit.badge}
            </Badge>
          ) : null}
        </span>
        {hit.subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {hit.subtitle}
          </span>
        ) : null}
      </span>
    </>
  );

  if (hit.external) {
    return (
      <a
        href={hit.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={() => onSelect(hit)}
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={hit.href} className={className} onClick={() => onSelect(hit)}>
      {body}
    </Link>
  );
}

export function AdminSearchResults({
  sections,
  activeIndex,
  flatHits,
  onSelect,
  emptyQuery,
  recentQueries,
  onRecentClick,
  onClearRecents,
  recentRequests,
  query,
  scopedLabel,
  idleScope,
}: {
  sections: AdminSearchSection[];
  activeIndex: number;
  flatHits: AdminSearchHit[];
  onSelect: (hit: AdminSearchHit) => void;
  emptyQuery: boolean;
  recentQueries: { query: string; at: number }[];
  onRecentClick: (query: string) => void;
  onClearRecents: () => void;
  recentRequests: AdminSearchHit[];
  query: string;
  scopedLabel?: string;
  /** When idle + rail not on All, render scoped browse instead of default recents. */
  idleScope?: import("@/lib/search/types").AdminSearchScope;
}) {
  if (emptyQuery) {
    // Rail narrowed away from All — show that scope's idle panel.
    if (idleScope && idleScope !== "all") {
      let running = 0;
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-1">
          {sections.map((section) => {
            const start = running;
            running += section.hits.length;
            return (
              <section key={section.id} className="flex flex-col gap-1">
                <h3 className="px-1 text-xs font-medium text-muted-foreground">
                  {section.title}
                </h3>
                {section.hits.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted-foreground">
                    {section.emptyMessage}
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {section.hits.map((hit, index) => (
                      <li key={hit.id}>
                        <HitRow
                          hit={hit}
                          active={activeIndex === start + index}
                          onSelect={onSelect}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-1">
        {recentQueries.length > 0 ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-medium text-muted-foreground">
                Recent searches
              </h3>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={onClearRecents}
              >
                Clear history
              </button>
            </div>
            <ul className="flex flex-col">
              {recentQueries.map((recent) => (
                <li key={`${recent.query}-${recent.at}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm hover:bg-muted/60"
                    onClick={() => onRecentClick(recent.query)}
                  >
                    <Search
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    {recent.query}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {recentRequests.length > 0 ? (
          <section className="flex flex-col gap-1">
            <h3 className="px-1 text-xs font-medium text-muted-foreground">
              Recent requests
            </h3>
            <ul className="flex flex-col">
              {recentRequests.map((hit, index) => (
                <li key={hit.id}>
                  <HitRow
                    hit={hit}
                    active={activeIndex === index}
                    onSelect={onSelect}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col gap-1">
          <h3 className="px-1 text-xs font-medium text-muted-foreground">
            Pages
          </h3>
          <ul className="flex flex-col">
            {sections
              .find((s) => s.id === "pages")
              ?.hits.map((hit, index) => {
                const offset = recentRequests.length;
                return (
                  <li key={hit.id}>
                    <HitRow
                      hit={hit}
                      active={activeIndex === offset + index}
                      onSelect={onSelect}
                    />
                  </li>
                );
              })}
          </ul>
        </section>
      </div>
    );
  }

  const visible = sections.filter(
    (s) => s.hits.length > 0 || s.stub || Boolean(s.emptyMessage),
  );

  if (visible.length === 0) {
    return (
      <div className="flex flex-1 items-start p-4">
        <p className="text-sm text-muted-foreground">
          No results for “{query}”. Try a request ref, company, product name, or
          blog topic.
        </p>
      </div>
    );
  }

  let running = 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-1">
        <div className="flex flex-col gap-5">
          {visible.map((section) => {
            const start = running;
            running += section.hits.length;
            return (
              <section key={section.id} className="flex flex-col gap-1">
                <h3 className="px-1 text-xs font-medium text-muted-foreground">
                  {section.title}
                </h3>
                {section.hits.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted-foreground">
                    {section.emptyMessage}
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {section.hits.map((hit, index) => (
                      <li key={hit.id}>
                        <HitRow
                          hit={hit}
                          active={activeIndex === start + index}
                          onSelect={onSelect}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
        <span className="sr-only">{flatHits.length} results</span>
      </div>

      {scopedLabel && query ? (
        <div className="border-t px-3 py-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="size-4 shrink-0" aria-hidden />
            <span>
              Search “{query}” in {scopedLabel}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
