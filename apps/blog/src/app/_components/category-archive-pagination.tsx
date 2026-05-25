import Link from "next/link";
import {
  categoryPageHref,
  type CategoryListFilters,
} from "@/lib/blog-category-archive";

type CategoryArchivePaginationProps = {
  categorySlug: string;
  pageNumber: number;
  totalPages: number;
  filters: CategoryListFilters;
};

export function CategoryArchivePagination({
  categorySlug,
  pageNumber,
  totalPages,
  filters,
}: CategoryArchivePaginationProps) {
  if (totalPages <= 1) return null;

  const prevHref =
    pageNumber > 1 ? categoryPageHref(categorySlug, pageNumber - 1, filters) : null;
  const nextHref =
    pageNumber < totalPages
      ? categoryPageHref(categorySlug, pageNumber + 1, filters)
      : null;

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-8"
      aria-label="Category archive pagination"
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
