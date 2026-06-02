import Link from "next/link";

type PaginationProps = {
  pageNumber: number;
  totalPages: number;
  /** Build the href for a given page number. */
  hrefForPage: (page: number) => string;
  ariaLabel?: string;
};

/**
 * Shared prev/next pager used by every archive (all posts, category, tag).
 * Callers supply `hrefForPage` so the component stays agnostic of the route's
 * URL scheme and filters.
 */
export function Pagination({
  pageNumber,
  totalPages,
  hrefForPage,
  ariaLabel = "Pagination",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevHref = pageNumber > 1 ? hrefForPage(pageNumber - 1) : null;
  const nextHref = pageNumber < totalPages ? hrefForPage(pageNumber + 1) : null;

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-8"
      aria-label={ariaLabel}
    >
      {prevHref ? (
        <Link
          href={prevHref}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Previous
        </Link>
      ) : (
        <span className="text-sm text-muted-foreground">← Previous</span>
      )}
      <p className="text-sm text-muted-foreground">
        Page {pageNumber} of {totalPages}
      </p>
      {nextHref ? (
        <Link
          href={nextHref}
          className="text-sm font-medium text-primary hover:underline"
        >
          Next →
        </Link>
      ) : (
        <span className="text-sm text-muted-foreground">Next →</span>
      )}
    </nav>
  );
}
