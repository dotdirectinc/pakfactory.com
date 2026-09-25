import type {ElementType, ReactNode} from "react";
import {cn} from "@pakfactory/ui/lib/utils";

export type PageDielinePaddingBlock = "none" | "xs" | "sm" | "md" | "lg";
export type PageDielineBand = "default" | "muted";
export type PageDielineAs = "div" | "section" | "header" | "footer" | "nav";

const PADDING_BLOCK_CLASS: Record<PageDielinePaddingBlock, string> = {
  none: "",
  xs: "py-2",
  sm: "py-8 sm:py-10 lg:py-12",
  md: "py-16 sm:py-20 lg:py-24",
  lg: "py-20 sm:py-24 lg:py-28",
};

const BAND_CLASS: Record<PageDielineBand, string> = {
  default: "bg-background",
  muted: "bg-muted",
};

/** Horizontal gutter outside the dashed dieline column (viewport → dieline edge). */
export function pageDielineOuterClass(className?: string) {
  return cn("w-full px-layout-gutter-outer", className);
}

/**
 * Break out of {@link pageDielineOuterClass} padding so borders/backgrounds span the
 * full viewport width (same pattern as `border-b` on the site header).
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

/** Centered content column without dashed vertical guides; gutters via `--layout-gutter-inner`. */
export function pageDielineContentClass(className?: string) {
  return cn(
    "mx-auto w-full max-w-[var(--layout-max)] px-layout-gutter-inner",
    className,
  );
}

/**
 * Centered column with dashed vertical guides; gutters via `--layout-gutter-inner`.
 * Flush to the dieline: pass `px-0` — twMerge clears `px-layout-gutter-inner`.
 */
export function pageDielineInnerClass(className?: string) {
  return cn(
    "mx-auto w-full max-w-[var(--layout-max)] border-x border-dashed border-border px-layout-gutter-inner",
    className,
  );
}

/** Vertical section rhythm on the inner column. */
export function pageDielinePaddingBlockClass(
  size?: PageDielinePaddingBlock,
  className?: string,
) {
  return cn(size && PADDING_BLOCK_CLASS[size], className);
}

/** Section band background for the outer / bleed row. */
export function pageDielineBandClass(band?: PageDielineBand, className?: string) {
  return cn(band && BAND_CLASS[band], className);
}

/** Full-viewport dashed top/bottom rules for the outer / bleed row. */
export function pageDielineBorderYClass({
  borderTop = false,
  borderBottom = false,
  className,
}: {
  borderTop?: boolean;
  borderBottom?: boolean;
  className?: string;
} = {}) {
  return cn(
    borderTop && "border-t border-dashed border-border",
    borderBottom && "border-b border-dashed border-border",
    className,
  );
}

type PageDielineSectionProps = {
  children: ReactNode;

  /** Polymorphic root. Default: `div`. */
  as?: PageDielineAs;
  id?: string;
  "aria-labelledby"?: string;

  /** Escape hatch on the outer / bleed row — layout only, not primary chrome. */
  className?: string;
  /** Escape hatch on the inner column — layout only, not primary chrome. */
  innerClassName?: string;

  /** Full-viewport dashed rules on the outer (or bleed) row. Default false. */
  borderTop?: boolean;
  borderBottom?: boolean;

  /** Vertical dieline guides on the inner column. Default true. */
  borderX?: boolean;

  /** Vertical section rhythm on the inner column. Default `md`. */
  paddingBlock?: PageDielinePaddingBlock;

  /** Section band background on the outer (or bleed) row. */
  band?: PageDielineBand;

  /** Break out of outer gutter so bg/borders span the viewport. */
  bleed?: boolean;

  /** Drop inner horizontal gutter (`px-0`). */
  flush?: boolean;
};

/** Wraps page-builder blocks inside a dieline shell. */
export function PageDielineBlockRail({children}: {children: ReactNode}) {
  return <div className={pageDielineOuterClass()}>{children}</div>;
}

/**
 * Outer viewport gutter + inner max-width dieline column.
 * Y-borders and band paint on the outer (or bleed) row; padding/flush/borderX on the inner.
 */
export function PageDielineSection({
  children,
  as: Root = "div",
  id,
  "aria-labelledby": ariaLabelledBy,
  className,
  innerClassName,
  borderTop = false,
  borderBottom = false,
  borderX = true,
  paddingBlock = "md",
  band,
  bleed = false,
  flush = false,
}: PageDielineSectionProps) {
  const chromeClass = cn(
    pageDielineBandClass(band),
    pageDielineBorderYClass({borderTop, borderBottom}),
  );

  const columnClass = borderX ? pageDielineInnerClass : pageDielineContentClass;
  const inner = (
    <div
      className={columnClass(
        cn(
          pageDielinePaddingBlockClass(paddingBlock),
          flush && "px-0",
          innerClassName,
        ),
      )}
    >
      {children}
    </div>
  );

  if (bleed) {
    const BleedRoot = Root as ElementType;
    return (
      <BleedRoot
        id={id}
        aria-labelledby={ariaLabelledBy}
        className={pageFullBleedRowClass(cn(chromeClass, className))}
      >
        <div className={pageFullBleedSectionContentClass()}>{inner}</div>
      </BleedRoot>
    );
  }

  const OuterRoot = Root as ElementType;
  return (
    <OuterRoot
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={pageDielineOuterClass(cn(chromeClass, className))}
    >
      {inner}
    </OuterRoot>
  );
}

type PageDielineFullBleedSectionProps = {
  children: ReactNode;
  sectionClassName?: string;
  innerClassName?: string;
  shellClassName?: string;
  borderTop?: boolean;
  borderBottom?: boolean;
  borderX?: boolean;
  paddingBlock?: PageDielinePaddingBlock;
  band?: PageDielineBand;
  flush?: boolean;
  "aria-labelledby"?: string;
  id?: string;
};

/**
 * Full-bleed horizontal band — thin wrapper around {@link PageDielineSection} with `bleed`.
 * Prefer `PageDielineSection bleed` on new call sites.
 */
export function PageDielineFullBleedSection({
  children,
  sectionClassName,
  innerClassName,
  shellClassName,
  borderTop = false,
  borderBottom = false,
  borderX = true,
  paddingBlock = "md",
  band,
  flush = false,
  "aria-labelledby": ariaLabelledBy,
  id,
}: PageDielineFullBleedSectionProps) {
  return (
    <PageDielineSection
      as="section"
      bleed
      id={id}
      aria-labelledby={ariaLabelledBy}
      borderTop={borderTop}
      borderBottom={borderBottom}
      borderX={borderX}
      paddingBlock={paddingBlock}
      band={band}
      flush={flush}
      className={cn(sectionClassName, shellClassName)}
      innerClassName={innerClassName}
    >
      {children}
    </PageDielineSection>
  );
}
