import type { ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";

/**
 * Horizontal gutter outside the dashed dieline column.
 * Mobile: 16px (`px-4`); with inner `px-4` = 32px total viewport → content (including border).
 */
export function pageDielineOuterClass(className?: string) {
  return cn("w-full px-4 sm:px-6 md:px-8", className);
}

/**
 * Break out of {@link pageDielineOuterClass} horizontal padding so borders/backgrounds
 * span the full viewport width (same pattern as `border-b` on the site header).
 */
export function pageFullBleedRowClass(className?: string) {
  return cn(
    "relative -mx-4 w-[calc(100%+2rem)] max-w-none sm:-mx-6 sm:w-[calc(100%+3rem)] md:-mx-8 md:w-[calc(100%+4rem)]",
    className,
  );
}

/** Same horizontal classes as outer gutter, for content inside a full-bleed row. */
export function pageFullBleedSectionContentClass(className?: string) {
  return pageDielineOuterClass(className);
}

/** Centered content column without dashed vertical guides (e.g. category header band). */
export function pageDielineContentClass(className?: string) {
  return cn("mx-auto w-full max-w-[var(--layout-max)] px-4 md:px-8", className);
}

/**
 * Centered column with dashed vertical guides; mobile `px-4` + outer `px-4` = 32px total including border.
 * Flush to the dieline (e.g. full-width borders): pass `px-0 md:px-0` — bare `px-0` does not clear `md:px-8`.
 */
export function pageDielineInnerClass(className?: string) {
  return cn(
    "mx-auto w-full max-w-[var(--layout-max)] border-x border-dashed border-border px-4 md:px-8",
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
