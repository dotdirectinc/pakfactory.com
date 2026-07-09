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
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevHref = pageNumber > 1 ? hrefForPage(pageNumber - 1) : null;
  const nextHref = pageNumber < totalPages ? hrefForPage(pageNumber + 1) : null;
  const window = getPaginationWindow(pageNumber, totalPages, maxVisiblePages);

  return (
    <nav
      className="flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label={ariaLabel}
    >
      <p className="text-sm text-muted-foreground">
        Page{" "}
        <span className="font-medium text-foreground">{pageNumber}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {prevHref ? (
          <Button asChild variant="ghost" size="sm" className="h-9 gap-2 px-3">
            <Link href={prevHref}>
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </Link>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2 px-3"
            disabled
            aria-disabled
          >
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </Button>
        )}

        <div className="flex items-center gap-1 overflow-x-auto">
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
        </div>

        {nextHref ? (
          <Button asChild variant="ghost" size="sm" className="h-9 gap-2 px-3">
            <Link href={nextHref}>
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2 px-3"
            disabled
            aria-disabled
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </nav>
  );
}
