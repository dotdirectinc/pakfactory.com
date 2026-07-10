import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { getPaginationWindow } from "../commons/pagination-window";

type PaginationProps = {
  pageNumber: number;
  totalPages: number;
  /** Use href-based navigation (next/link). Mutually exclusive with onPageChange. */
  hrefForPage?: (page: number) => string;
  /** Use callback-based navigation (client state). Mutually exclusive with hrefForPage. */
  onPageChange?: (page: number) => void;
  ariaLabel?: string;
  maxVisiblePages?: number;
  rightSlot?: ReactNode;
};

export function Pagination({
  pageNumber,
  totalPages,
  hrefForPage,
  onPageChange,
  ariaLabel = "Pagination",
  maxVisiblePages = 5,
  rightSlot,
}: PaginationProps) {
  const prevPage = pageNumber > 1 ? pageNumber - 1 : null;
  const nextPage = pageNumber < totalPages ? pageNumber + 1 : null;
  const window = getPaginationWindow(pageNumber, totalPages, maxVisiblePages);

  function PageButton({ page, label }: { page: number; label?: string }) {
    const isActive = page === pageNumber;
    const content = label ?? page;

    if (isActive) {
      return (
        <Button variant="outline" size="icon" className="size-9 shrink-0" aria-current="page" aria-label={`Page ${page}, current page`} disabled>
          {content}
        </Button>
      );
    }
    if (hrefForPage) {
      return (
        <Button asChild variant="ghost" size="icon" className="size-9 shrink-0">
          <Link href={hrefForPage(page)} aria-label={`Page ${page}`}>{content}</Link>
        </Button>
      );
    }
    return (
      <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => onPageChange?.(page)} aria-label={`Page ${page}`}>
        {content}
      </Button>
    );
  }

  function NavButton({ page, dir }: { page: number | null; dir: "prev" | "next" }) {
    const label = dir === "prev" ? "Previous" : "Next";
    const icon = dir === "prev"
      ? <ChevronLeft className="size-3.5" aria-hidden />
      : <ChevronRight className="size-3.5" aria-hidden />;
    const content = dir === "prev"
      ? <>{icon}{label}</>
      : <>{label}{icon}</>;

    if (!page) {
      return <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2" disabled aria-disabled>{content}</Button>;
    }
    if (hrefForPage) {
      return (
        <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 px-2">
          <Link href={hrefForPage(page)}>{content}</Link>
        </Button>
      );
    }
    return (
      <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2" onClick={() => onPageChange?.(page)}>
        {content}
      </Button>
    );
  }

  const pageInfo = (
    <p className="text-sm text-muted-foreground">
      Page <span className="font-medium text-foreground">{pageNumber}</span> of{" "}
      <span className="font-medium text-foreground">{totalPages}</span>
    </p>
  );

  const nav = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <NavButton page={prevPage} dir="prev" />
      {window.map((n) => <PageButton key={n} page={n} />)}
      <NavButton page={nextPage} dir="next" />
    </div>
  );

  return (
    <nav aria-label={ariaLabel} className="py-3 text-sm">
      <div className="hidden sm:grid sm:grid-cols-3 sm:items-center">
        <div className="justify-self-start">{pageInfo}</div>
        <div className="justify-self-center">{nav}</div>
        <div className="justify-self-end">{rightSlot ?? null}</div>
      </div>
      <div className="flex flex-col items-center gap-3 sm:hidden">
        {nav}
        <div className="flex items-center gap-3">
          {pageInfo}
          {rightSlot}
        </div>
      </div>
    </nav>
  );
}
