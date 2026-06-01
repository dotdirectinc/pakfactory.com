import Link from "next/link";
import { archivePageHref } from "@/lib/blog-archive";

type ArchivePaginationProps = {
  pageNumber: number;
  totalPages: number;
};

export function ArchivePagination({ pageNumber, totalPages }: ArchivePaginationProps) {
  if (totalPages <= 1) return null;

  const prevHref = pageNumber > 1 ? archivePageHref(pageNumber - 1) : null;
  const nextHref = pageNumber < totalPages ? archivePageHref(pageNumber + 1) : null;

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-8"
      aria-label="Archive pagination"
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
