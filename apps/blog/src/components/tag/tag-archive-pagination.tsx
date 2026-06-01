import Link from "next/link";
import { tagPageHref, type TagListFilters } from "@/lib/blog-tag-archive";

type TagArchivePaginationProps = {
  tagSlug: string;
  pageNumber: number;
  totalPages: number;
  filters: TagListFilters;
};

export function TagArchivePagination({
  tagSlug,
  pageNumber,
  totalPages,
  filters,
}: TagArchivePaginationProps) {
  if (totalPages <= 1) return null;

  const prevHref =
    pageNumber > 1 ? tagPageHref(tagSlug, pageNumber - 1, filters) : null;
  const nextHref =
    pageNumber < totalPages ? tagPageHref(tagSlug, pageNumber + 1, filters) : null;

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-8"
      aria-label="Tag archive pagination"
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
