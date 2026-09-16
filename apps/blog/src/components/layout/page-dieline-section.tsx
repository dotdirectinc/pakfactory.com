import type { ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";

/**
 * Horizontal gutter outside the dashed dieline column.
 * Values from `--layout-gutter-outer` / `--layout-gutter-inner` (mobile 16+16; sm+ outer steps + inner 80 to match section py-20).
 */
export function pageDielineOuterClass(className?: string) {
  return cn("w-full px-layout-gutter-outer", className);
}

/**
 * Break out of {@link pageDielineOuterClass} horizontal padding so borders/backgrounds
 * span the full viewport width (same pattern as `border-b` on the site header).
 */
export function pageFullBleedRowClass(className?: string) {
  return cn(
    "relative -mx-layout-gutter-outer w-[calc(100%+2*var(--layout-gutter-outer))] max-w-none",
    className,
  );
}

/** Same horizontal classes as outer gutter, for content inside a full-bleed row. */
export function pageFullBleedSectionContentClass(className?: string) {
  return pageDielineOuterClass(className);
}

/** Centered content column without dashed vertical guides (e.g. category header band). */
export function pageDielineContentClass(className?: string) {
  return cn(
    "mx-auto w-full max-w-[var(--layout-max)] px-layout-gutter-inner",
    className,
  );
}

/**
 * Centered column with dashed vertical guides; gutters via `--layout-gutter-inner`.
 * Flush to the dieline (e.g. full-width borders): pass `px-0` — twMerge clears the token utility.
 */
export function pageDielineInnerClass(className?: string) {
  return cn(
    "mx-auto w-full max-w-[var(--layout-max)] border-x border-dashed border-border px-layout-gutter-inner",
    className,
  );
}

type PageDielineSectionProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /** Dashed top edge on the inner dieline column (opt-in; avoids double-dash when stacking bands). */
  borderTop?: boolean;
  /** Dashed bottom edge on the inner dieline column (opt-in). */
  borderBottom?: boolean;
};

/**
 * Wraps page-builder blocks below fixed dieline sections on landing shells.
 * Same outer gutter contract as homepage `<main className={pageDielineOuterClass()}>`.
 */
export function PageDielineBlockRail({ children }: { children: ReactNode }) {
  return <div className={pageDielineOuterClass()}>{children}</div>;
}

/** Outer viewport gutter + inner max-width dieline column. */
export function PageDielineSection({
  children,
  className,
  innerClassName,
  borderTop = false,
  borderBottom = false,
}: PageDielineSectionProps) {
  return (
    <div className={pageDielineOuterClass(className)}>
      <div
        className={pageDielineInnerClass(
          cn(
            innerClassName,
            borderTop && "border-t border-dashed border-border",
            borderBottom && "border-b border-dashed border-border",
          ),
        )}
      >
        {children}
      </div>
    </div>
  );
}

type PageDielineFullBleedSectionProps = {
  children: ReactNode;
  sectionClassName?: string;
  innerClassName?: string;
  shellClassName?: string;
  /** Dashed top edge on the inner dieline column (opt-in; avoids double-dash when stacking bands). */
  borderTop?: boolean;
  /** Dashed bottom edge on the inner dieline column (opt-in). */
  borderBottom?: boolean;
  /**
   * Dashed left/right guides on the inner column. Defaults to true.
   * Set false for bands that should only show horizontal dielines.
   */
  borderX?: boolean;
  "aria-labelledby"?: string;
  id?: string;
};

/**
 * Full-bleed horizontal band inside a page shell: borders and backgrounds span the
 * viewport while children sit in the same outer + inner gutter stack.
 */
export function PageDielineFullBleedSection({
  children,
  sectionClassName,
  innerClassName,
  shellClassName,
  borderTop = false,
  borderBottom = false,
  borderX = true,
  "aria-labelledby": ariaLabelledBy,
  id,
}: PageDielineFullBleedSectionProps) {
  const columnClass = borderX ? pageDielineInnerClass : pageDielineContentClass;

  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn(pageFullBleedRowClass(), sectionClassName)}
    >
      <div className={pageFullBleedSectionContentClass(shellClassName)}>
        <div
          className={columnClass(
            cn(
              innerClassName,
              borderTop && "border-t border-dashed border-border",
              borderBottom && "border-b border-dashed border-border",
            ),
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
