import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@pakfactory/ui/components/button";
import { getPaginationWindow } from "../commons/pagination-window";
import { PaginationLink } from "./pagination-link";
import { PaginationScroll } from "./pagination-scroll";

/** Shared id for the top of a paginated listing — one listing per route. */
export const LISTING_TOP_ID = "listing-top";

type PaginationProps = {
  pageNumber: number;
  totalPages: number;
  /** Use href-based navigation (next/link). Mutually exclusive with onPageChange. */
  hrefForPage?: (page: number) => string;
  /** Use callback-based navigation (client state). Mutually exclusive with hrefForPage. */
  onPageChange?: (page: number) => void;
  ariaLabel?: string;
  maxVisiblePages?: number;
  /** Content rendered in the right column (e.g. a per-page selector). Feature-owned. */
  rightSlot?: ReactNode;
  /**
   * href mode only: after a pagination click, smooth-scroll to this element id,
   * persisting the intent across the full navigation. Ignored in callback mode —
   * there the caller scrolls imperatively (see `usePathPagination`).
   */
  scrollTargetId?: string;
};

/**
 * Shared archive pager (props-only presentation core, ADR-013). Callers own
 * URL/state wiring: pass `hrefForPage` for link-based archives or `onPageChange`
 * for client-filtered listings, and a `rightSlot` for the feature's per-page
 * control.
 *
 * Single-page rule (PROD-1994 / PROD-1998): render this component only when the
 * listing has results (caller-guarded); with `totalPages === 1` it shows page
 * info + `rightSlot` and hides the center page nav.
 *
 * Scroll-to-listing (href mode) is opt-in via `scrollTargetId` — a generic id,
 * not baked to any feature.
 */
export function Pagination({
  pageNumber,
  totalPages,
  hrefForPage,
  onPageChange,
  ariaLabel = "Pagination",
  maxVisiblePages = 5,
  rightSlot,
  scrollTargetId,
}: PaginationProps) {
  const prevPage = pageNumber > 1 ? pageNumber - 1 : null;
  const nextPage = pageNumber < totalPages ? pageNumber + 1 : null;
  const window = getPaginationWindow(pageNumber, totalPages, maxVisiblePages);
  const useScrollLink = Boolean(hrefForPage && scrollTargetId);
  // href mode uses a real anchor; the scroll variant persists intent across the
  // navigation. Callback mode falls through to onClick.
  const LinkComponent = useScrollLink ? PaginationLink : Link;

  function PageButton({ page }: { page: number }) {
    const isActive = page === pageNumber;
    if (isActive) {
      return (
        <Button variant="outline" size="icon" className="size-9 shrink-0" aria-current="page" aria-label={`Page ${page}, current page`} disabled>
          {page}
        </Button>
      );
    }
    if (hrefForPage) {
      return (
        <Button asChild variant="ghost" size="icon" className="size-9 shrink-0">
          <LinkComponent href={hrefForPage(page)} aria-label={`Page ${page}`}>{page}</LinkComponent>
        </Button>
      );
    }
    return (
      <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => onPageChange?.(page)} aria-label={`Page ${page}`}>
        {page}
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
          <LinkComponent href={hrefForPage(page)}>{content}</LinkComponent>
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

  // Single page → hide the center nav; only page info + right slot remain.
  const nav = totalPages > 1 ? (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <NavButton page={prevPage} dir="prev" />
      {window.map((n) => <PageButton key={n} page={n} />)}
      <NavButton page={nextPage} dir="next" />
    </div>
  ) : null;

  return (
    <nav aria-label={ariaLabel} className="py-3 text-sm">
      {useScrollLink ? (
        <PaginationScroll targetId={scrollTargetId as string} pageNumber={pageNumber} />
      ) : null}
      {/* Desktop: 3-col grid — page info left · nav centred · right slot */}
      <div className="hidden sm:grid sm:grid-cols-3 sm:items-center">
        <div className="justify-self-start">{pageInfo}</div>
        <div className="justify-self-center">{nav}</div>
        <div className="justify-self-end">{rightSlot ?? null}</div>
      </div>
      {/* Mobile: nav centred on top, page info + right slot below */}
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
