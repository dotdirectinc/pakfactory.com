"use client";

import type { ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";

export type RequestProductCardDetailRow = {
  key: string;
  label: string;
  children: ReactNode;
  /** Row action (e.g. Edit). Omit for read-only surfaces. */
  action?: ReactNode;
};

export type RequestProductCardProps = {
  title: ReactNode;
  /** Optional SKU / eyebrow above the title. */
  eyebrow?: ReactNode;
  thumbSrc?: string | null;
  /** Classes on the `<img>` (default `object-contain`). */
  thumbObjectClassName?: string;
  /** Optional absolute inset wrapper around the image (e.g. media scale). */
  thumbInnerClassName?: string;
  detailRows: RequestProductCardDetailRow[];
  /** Bottom row inside the body column (e.g. Remove). */
  footer?: ReactNode;
  /** Trailing column (e.g. pool checkbox). */
  trailing?: ReactNode;
  className?: string;
  /**
   * Controlled expand. When defined, the card is collapsible: details/footer
   * hide when `false`, and a chevron sits immediately before `trailing`.
   * Omit entirely for always-open chrome (account/admin).
   */
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
  /** Shown under the title when collapsed (e.g. qty summary). */
  collapsedSummary?: ReactNode;
  /** Accessible name for the expand/collapse control. */
  expandLabel?: string;
};

const SIDE_COL_CLASS = "w-[88px] shrink-0 sm:w-[115px]";

const ROW_LABEL_CLASS =
  "w-[120px] shrink-0 text-xs font-semibold text-foreground sm:w-[140px]";

function ExpandChevron({ open }: { open: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn(
        "transition-transform duration-150",
        open ? "rotate-180" : "rotate-0",
      )}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Props-only RFQ line-item card chrome shared by www and admin.
 * Controllers own data mapping, copy, and action wiring.
 */
export function RequestProductCard({
  title,
  eyebrow,
  thumbSrc,
  thumbObjectClassName = "object-contain",
  thumbInnerClassName,
  detailRows,
  footer,
  trailing,
  className,
  expanded,
  onExpandedChange,
  collapsedSummary,
  expandLabel = "Expand details",
}: RequestProductCardProps) {
  const collapsible = expanded !== undefined;
  const isExpanded = !collapsible || expanded;

  function toggleExpanded() {
    if (!collapsible || !onExpandedChange) return;
    onExpandedChange(!expanded);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-background p-8",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(SIDE_COL_CLASS, collapsible && "cursor-pointer")}
          onClick={collapsible ? toggleExpanded : undefined}
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
            {thumbSrc ? (
              thumbInnerClassName ? (
                <div className={thumbInnerClassName}>
                  {/* Caller supplies catalog / attachment URLs. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc}
                    alt=""
                    className={cn("size-full", thumbObjectClassName)}
                  />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbSrc}
                  alt=""
                  className={cn("size-full", thumbObjectClassName)}
                />
              )
            ) : (
              <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                —
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              isExpanded ? "pb-4" : "pb-0",
              collapsible && "cursor-pointer",
            )}
            onClick={collapsible ? toggleExpanded : undefined}
          >
            {eyebrow ? (
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {eyebrow}
              </p>
            ) : null}
            <p className="text-lg font-semibold tracking-tight">{title}</p>
            {!isExpanded && collapsedSummary ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {collapsedSummary}
              </div>
            ) : null}
          </div>

          {isExpanded
            ? detailRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-start gap-4 border-t border-dashed border-border py-4"
                >
                  <p className={ROW_LABEL_CLASS}>{row.label}</p>
                  <div className="min-w-0 flex-1 text-xs text-foreground">
                    {row.children}
                  </div>
                  {row.action ? (
                    <div className="shrink-0">{row.action}</div>
                  ) : null}
                </div>
              ))
            : null}

          {isExpanded && footer ? (
            <div className="flex justify-end border-t border-dashed border-border py-4">
              {footer}
            </div>
          ) : null}
        </div>

        {collapsible || trailing ? (
          <div
            className={cn(
              SIDE_COL_CLASS,
              "flex items-start justify-end gap-2",
            )}
          >
            {collapsible ? (
              <button
                type="button"
                className="inline-flex size-6 items-center justify-center text-muted-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                aria-expanded={expanded}
                aria-label={expandLabel}
                onClick={toggleExpanded}
              >
                <ExpandChevron open={Boolean(expanded)} />
              </button>
            ) : null}
            {trailing ? (
              <div
                className="flex items-start justify-end"
                onClick={(event) => event.stopPropagation()}
              >
                {trailing}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
