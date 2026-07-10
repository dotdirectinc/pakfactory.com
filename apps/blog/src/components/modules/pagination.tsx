import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { getPaginationWindow } from "@/lib/pagination-window";

type PaginationProps = {
  pageNumber: number;
  totalPages: number;
  /** Build the href for a given page number. */
  hrefForPage: (page: number) => string;
  ariaLabel?: string;
  /** Max numbered page buttons shown at once (sliding window). */
  maxVisiblePages?: number;
  /** Optional content rendered in the right column of the desktop 3-col layout. */
  rightSlot?: ReactNode;
};

/**
 * Shared archive pager — Figma Topic Detail layout: status left, numbered
 * controls + Previous/Next right. Callers supply `hrefForPage` so the
 * component stays agnostic of route URL scheme and filters.
 */
export function Pagination({
  pageNumber,
  totalPages,
  hrefForPage,
  ariaLabel = "Pagination",
  maxVisiblePages = 5,
  rightSlot,
}: PaginationProps) {
  const prevHref = pageNumber > 1 ? hrefForPage(pageNumber - 1) : null;
  const nextHref = pageNumber < totalPages ? hrefForPage(pageNumber + 1) : null;
  const window = getPaginationWindow(pageNumber, totalPages, maxVisiblePages);

  const pageInfo = (
    <p className="text-sm text-muted-foreground">
      Page{" "}
      <span className="font-medium text-foreground">{pageNumber}</span> of{" "}
      <span className="font-medium text-foreground">{totalPages}</span>
    </p>
  );

  const nav = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {prevHref ? (
        <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 px-2">
          <Link href={prevHref}>
            <ChevronLeft className="size-3.5" aria-hidden />
            Previous
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 px-2"
          disabled
          aria-disabled
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          Previous
        </Button>
      )}

      {window.map((n) => {
        const isActive = n === pageNumber;
        if (isActive) {
          return (
            <Button
              key={n}
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-current="page"
              aria-label={`Page ${n}, current page`}
              disabled
            >
              {n}
            </Button>
          );
        }
        return (
          <Button
            key={n}
            asChild
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
          >
            <Link href={hrefForPage(n)} aria-label={`Page ${n}`}>
              {n}
            </Link>
          </Button>
        );
      })}

      {nextHref ? (
        <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 px-2">
          <Link href={nextHref}>
            Next
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 px-2"
          disabled
          aria-disabled
        >
          Next
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
      )}
    </div>
  );

  return (
    <nav aria-label={ariaLabel} className="py-3 text-sm">
      {/* Desktop: 3-col grid — page info left · nav centred · right slot */}
      <div className="hidden sm:grid sm:grid-cols-3 sm:items-center">
        {pageInfo}
        {nav}
        <div className="flex justify-end">{rightSlot ?? null}</div>
      </div>
      {/* Mobile: nav centred on top, page info + per-page below */}
      <div className="flex flex-col items-center gap-3 sm:hidden">
        {nav}
        <div className="flex items-center gap-3">
          {pageInfo}
          {rightSlot ?? null}
        </div>
      </div>
    </nav>
  );
}
