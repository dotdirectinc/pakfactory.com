import type { ComponentProps, ReactNode } from "react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { JsonLdScript } from "@/components/ui/json-ld-script";
import {
  LISTING_TOP_ID,
  Pagination,
} from "@/components/modules/pagination";

type ArchiveLayoutProps = {
  /** Pre-serialized JSON-LD string for this archive. */
  jsonLd: string;
  crumbs: ComponentProps<typeof Breadcrumb>["items"];
  /** Optional uppercase eyebrow above the heading (e.g. tag group). */
  kicker?: string;
  heading: string;
  /** Description / count markup — caller owns the exact copy + spacing. */
  intro?: ReactNode;
  /** Filter chips slot, rendered above the posts region. */
  filters?: ReactNode;
  /** Right rail. When omitted, the posts region is full-width. */
  sidebar?: ReactNode;
  /** Two-column grid template when a sidebar is present. */
  columns?: string;
  /** The posts list/grid — caller chooses columns, card variant, empty state. */
  children: ReactNode;
  pagination: {
    pageNumber: number;
    totalPages: number;
    hrefForPage: (page: number) => string;
    ariaLabel?: string;
    rightSlot?: ReactNode;
    scrollTargetId?: string;
    /** When false, hide the pagination bar (e.g. empty listing). */
    show?: boolean;
  };
};

/**
 * Shared layout shell for post archives (category, tag, all).
 * Owns the common chrome — JSON-LD, container, header, two-col vs full-width
 * layout, pagination. Takes primitives + slots only; never imports lib data
 * types, so the dependency stays shared → feature.
 */
export function ArchiveLayout({
  jsonLd,
  crumbs,
  kicker,
  heading,
  intro,
  filters,
  sidebar,
  columns = "lg:grid-cols-[minmax(0,1fr)_240px]",
  children,
  pagination,
}: ArchiveLayoutProps) {
  const body = (
    <>
      {filters}
      <div id={LISTING_TOP_ID} className="scroll-mt-24">
        {children}
      </div>
      {pagination.show !== false && (
        <div className="py-16">
          <Pagination
            pageNumber={pagination.pageNumber}
            totalPages={pagination.totalPages}
            hrefForPage={pagination.hrefForPage}
            ariaLabel={pagination.ariaLabel}
            rightSlot={pagination.rightSlot}
            scrollTargetId={pagination.scrollTargetId ?? LISTING_TOP_ID}
          />
        </div>
      )}
    </>
  );

  return (
    <>
      <JsonLdScript jsonLd={jsonLd} />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <Breadcrumb items={crumbs} />
          {kicker && (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">
              {kicker}
            </p>
          )}
          <h1
            className={`${kicker ? "mt-1" : "mt-3"} text-3xl font-bold tracking-tight sm:text-4xl`}
          >
            {heading}
          </h1>
          {intro}
        </div>

        {sidebar ? (
          <div className={`grid gap-10 ${columns}`}>
            <div>{body}</div>
            {sidebar}
          </div>
        ) : (
          body
        )}
      </div>
    </>
  );
}
