import type { ReactNode } from "react";
import { cn } from "@pakfactory/ui/lib/utils";

/** Horizontal gutter outside the dashed dieline column (viewport → dieline edge). */
export function pageDielineOuterClass(className?: string) {
  return cn("w-full px-4 sm:px-6 md:px-8", className);
}

/**
 * Break out of {@link pageDielineOuterClass} padding so borders/backgrounds span the
 * full viewport width (same pattern as `border-b` on the site header).
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

/** Centered content column without dashed vertical guides. */
export function pageDielineContentClass(className?: string) {
  return cn("mx-auto w-full max-w-[var(--layout-max)] px-8", className);
}

/** Centered column with dashed vertical guides; default inner horizontal padding `px-8`. */
export function pageDielineInnerClass(className?: string) {
  return cn(
    "mx-auto w-full max-w-[var(--layout-max)] border-x border-dashed border-border px-8",
    className,
  );
}

type PageDielineSectionProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

/** Wraps page-builder blocks inside a dieline shell. */
export function PageDielineBlockRail({ children }: { children: ReactNode }) {
  return <div className={pageDielineOuterClass()}>{children}</div>;
}

/** Outer viewport gutter + inner max-width dieline column. */
export function PageDielineSection({
  children,
  className,
  innerClassName,
}: PageDielineSectionProps) {
  return (
    <div className={pageDielineOuterClass(className)}>
      <div className={pageDielineInnerClass(innerClassName)}>{children}</div>
    </div>
  );
}

type PageDielineFullBleedSectionProps = {
  children: ReactNode;
  sectionClassName?: string;
  innerClassName?: string;
  shellClassName?: string;
  borderTop?: boolean;
  borderBottom?: boolean;
  "aria-labelledby"?: string;
  id?: string;
};

/** Full-bleed horizontal band: borders span the viewport, children stay in the dieline column. */
export function PageDielineFullBleedSection({
  children,
  sectionClassName,
  innerClassName,
  shellClassName,
  borderTop = false,
  borderBottom = false,
  "aria-labelledby": ariaLabelledBy,
  id,
}: PageDielineFullBleedSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn(pageFullBleedRowClass(), sectionClassName)}
    >
      <div className={pageFullBleedSectionContentClass(shellClassName)}>
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
    </section>
  );
}
