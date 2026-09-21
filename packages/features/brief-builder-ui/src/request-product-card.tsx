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
};

const SIDE_COL_CLASS = "w-[88px] shrink-0 sm:w-[115px]";

const ROW_LABEL_CLASS =
  "w-[120px] shrink-0 text-xs font-semibold text-foreground sm:w-[140px]";

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
}: RequestProductCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-background p-8",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className={SIDE_COL_CLASS}>
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
          <div className="pb-4">
            {eyebrow ? (
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {eyebrow}
              </p>
            ) : null}
            <p className="text-lg font-semibold tracking-tight">{title}</p>
          </div>

          {detailRows.map((row) => (
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
          ))}

          {footer ? (
            <div className="flex justify-end border-t border-dashed border-border py-4">
              {footer}
            </div>
          ) : null}
        </div>

        {trailing ? (
          <div className={cn(SIDE_COL_CLASS, "flex items-start justify-end")}>
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}
