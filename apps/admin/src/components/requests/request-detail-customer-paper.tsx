"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  RequestReviewPaper,
  type RequestReviewPageSlice,
} from "@pakfactory/brief-builder-ui/request-review-paper";
import { DEFAULT_REQUEST_REVIEW_COPY } from "@pakfactory/brief-builder-ui/request-review-copy";
import type { RequestDraft, RequestLine } from "@pakfactory/domain/request";
import { cn } from "@pakfactory/ui/lib/utils";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

/** Letter aspect only — do not put overflow-hidden here; it clips the paper shadow. */
const LETTER_PAPER_CLASS = "aspect-[8.5/11] w-full max-w-full shrink-0";

/**
 * Omnidirectional soft shadow for the admin viewer.
 * RequestReviewPaper defaults to shadow-2xl (mostly downward) which reads as
 * "cut off" on the top edge even when the clip pad is large enough.
 */
const VIEWER_PAPER_SHADOW_CLASS =
  "!shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_28px_rgba(0,0,0,0.14),0_2px_6px_rgba(0,0,0,0.06)]";

const LETTER_ASPECT = 11 / 8.5;

const THUMB_WIDTH_PX = 72;
const THUMB_SCALE = THUMB_WIDTH_PX / 688;
/** Thumb column + nav horizontal padding (`px-1` + `pr-2`) + stage `gap-4`. */
const THUMB_RAIL_BUDGET_PX = THUMB_WIDTH_PX + 12 + 16;

const PAGE_GAP_PX = 16;
const PEEK_FRACTION = 1 / 3;
/** Outside the overflow mask — room for soft shadow; does not shrink the letter. */
const OUTER_GUTTER_PX = 24;

type RequestDetailCustomerPaperStackProps = {
  draft: RequestDraft;
  lines: RequestLine[];
  displayRef: string;
  documentDate: string;
  logoSlot?: ReactNode;
};

function humanizeProductSlug(slug: string): string {
  return slug.replace(/-/g, " ");
}

function isExpressRequirementsOnly(draft: RequestDraft): boolean {
  return draft.express && !draft.productsExpanded;
}

function overflowScore(draft: RequestDraft, lines: RequestLine[]): number {
  const briefLen = draft.notes.trim().length;
  let score = lines.length;

  if (briefLen > 200) score += 2;
  if (briefLen > 400) score += 2;
  if (draft.timeline.trim()) score += 1;
  if (draft.packagingContents) score += 1;
  if (isExpressRequirementsOnly(draft) && draft.expressQuantities.length > 0) {
    score += 1;
  }

  return score;
}

function needsTwoPages(draft: RequestDraft, lines: RequestLine[]): boolean {
  return overflowScore(draft, lines) > 4;
}

function buildPageSlices(
  draft: RequestDraft,
  lines: RequestLine[],
): RequestReviewPageSlice[] {
  if (!needsTwoPages(draft, lines)) {
    return [
      {
        lines,
        showContactBlock: true,
        showBriefBlock: true,
        showDisclaimer: true,
      },
    ];
  }

  return [
    {
      lines,
      showContactBlock: true,
      showBriefBlock: false,
      showDisclaimer: false,
    },
    {
      lines: [],
      showContactBlock: false,
      showBriefBlock: true,
      showDisclaimer: true,
      pageLabel: "Page 2 of 2",
    },
  ];
}

function CustomerPaperSheet({
  draft,
  lines,
  displayRef,
  documentDate,
  logoSlot,
  pageSlice,
  className,
}: RequestDetailCustomerPaperStackProps & {
  pageSlice: RequestReviewPageSlice;
  className?: string;
}) {
  return (
    <RequestReviewPaper
      draft={draft}
      lines={lines}
      displayRef={displayRef}
      documentDate={documentDate}
      copy={DEFAULT_REQUEST_REVIEW_COPY}
      mode="readonly"
      logoSlot={logoSlot}
      productTitle={humanizeProductSlug}
      pageSlice={pageSlice}
      density="tight"
      className={cn(LETTER_PAPER_CLASS, VIEWER_PAPER_SHADOW_CLASS, className)}
    />
  );
}

function PaperThumbnail({
  props,
  pageSlice,
  pageNumber,
  pageCount,
  selected,
  onSelect,
}: {
  props: RequestDetailCustomerPaperStackProps;
  pageSlice: RequestReviewPageSlice;
  pageNumber: number;
  pageCount: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const label = ADMIN_REQUESTS_COPY.paperPageLabel(pageNumber, pageCount);
  const thumbHeight = Math.round(THUMB_WIDTH_PX * LETTER_ASPECT);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-xs bg-background shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "ring-2 ring-border ring-offset-2 ring-offset-[#f2f2f2]"
          : "ring-1 ring-border hover:ring-muted-foreground/40",
      )}
      style={{ width: THUMB_WIDTH_PX, height: thumbHeight }}
    >
      <div
        aria-hidden
        className="pointer-events-none origin-top-left rounded-xs"
        style={{
          width: 688,
          transform: `scale(${THUMB_SCALE})`,
        }}
      >
        <CustomerPaperSheet
          {...props}
          pageSlice={pageSlice}
          className="shadow-none ring-0"
        />
      </div>
    </button>
  );
}

function PaperPeekCarousel({
  props,
  pageSlices,
  activeIndex,
  onActiveIndexChange,
  availableWidth,
  availableHeight,
}: {
  props: RequestDetailCustomerPaperStackProps;
  pageSlices: RequestReviewPageSlice[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  availableWidth: number;
  availableHeight: number;
}) {
  const pageCount = pageSlices.length;
  const safeIndex = Math.min(activeIndex, pageCount - 1);

  // Outer gutter is outside the mask — fit one full page + peek into the mask budget.
  const maskWidthBudget = Math.max(0, availableWidth - OUTER_GUTTER_PX * 2);
  const maskHeightBudget = Math.max(0, availableHeight - OUTER_GUTTER_PX * 2);
  const widthFromHeight =
    maskHeightBudget > 0
      ? (maskHeightBudget - PAGE_GAP_PX) /
        (LETTER_ASPECT * (1 + PEEK_FRACTION))
      : 0;
  const pageWidth =
    maskWidthBudget > 0 && widthFromHeight > 0
      ? Math.min(maskWidthBudget, widthFromHeight)
      : maskWidthBudget;
  const pageHeight = pageWidth * LETTER_ASPECT;
  const step = pageHeight + PAGE_GAP_PX;
  const maskContentHeight =
    pageHeight > 0
      ? pageHeight * (1 + PEEK_FRACTION) + PAGE_GAP_PX
      : 0;
  const trackHeight =
    pageCount > 0 && pageHeight > 0
      ? pageCount * pageHeight + (pageCount - 1) * PAGE_GAP_PX
      : 0;
  const maxTranslate = Math.max(0, trackHeight - maskContentHeight);
  const translateY =
    pageHeight > 0 ? -Math.min(safeIndex * step, maxTranslate) : 0;
  const ready = pageWidth > 0 && maskContentHeight > 0;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-start justify-start overflow-visible",
        !ready && "invisible",
      )}
      aria-hidden={!ready}
      style={{ padding: OUTER_GUTTER_PX }}
    >
      {/* Clip page bodies for peek; overflow-clip-margin lets box-shadow paint into the gutter. */}
      <div
        className="relative"
        style={{
          width: ready ? pageWidth : 0,
          height: ready ? maskContentHeight : 0,
          overflow: "clip",
          overflowClipMargin: OUTER_GUTTER_PX,
        }}
      >
        <div
          className="flex flex-col transition-transform duration-300 ease-out will-change-transform"
          style={{
            width: ready ? pageWidth : undefined,
            gap: PAGE_GAP_PX,
            transform: `translateY(${translateY}px)`,
          }}
        >
          {pageSlices.map((pageSlice, index) => {
            const isActive = index === safeIndex;

            return (
              <button
                key={`${pageSlice.pageLabel ?? "page"}-${index}`}
                type="button"
                disabled={isActive || !ready}
                aria-label={ADMIN_REQUESTS_COPY.paperPageLabel(
                  index + 1,
                  pageCount,
                )}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  if (!isActive) onActiveIndexChange(index);
                }}
                className={cn(
                  "w-full shrink-0 text-left",
                  isActive ? "cursor-default" : "cursor-pointer",
                )}
                style={{ width: ready ? pageWidth : undefined }}
              >
                <CustomerPaperSheet {...props} pageSlice={pageSlice} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function RequestDetailCustomerPaperStack({
  className,
  ...props
}: RequestDetailCustomerPaperStackProps & { className?: string }) {
  const { draft, lines } = props;
  const pageSlices = buildPageSlices(draft, lines);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, pageSlices.length - 1);
  const multiPage = pageSlices.length > 1;
  const hostRef = useRef<HTMLDivElement>(null);
  const [hostSize, setHostSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const syncSize = () => {
      const rect = el.getBoundingClientRect();
      setHostSize({ width: rect.width, height: rect.height });
    };

    syncSize();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setHostSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const carouselAvailableWidth = Math.max(
    0,
    Math.min(hostSize.width, multiPage ? 48 * 16 : 43 * 16) -
      (multiPage ? THUMB_RAIL_BUDGET_PX : 0),
  );
  const hostMeasured = hostSize.width > 0 && hostSize.height > 0;

  return (
    <div
      ref={hostRef}
      className={cn(
        "flex h-full min-h-[min(70vh,800px)] w-full flex-col bg-[#f2f2f2] xl:min-h-0 xl:bg-transparent",
        className,
      )}
    >
      {/* Full-width gray stage — spans the preview column; height hugs paper/thumbs (+ gutter). */}
      <div
        className={cn(
          "flex w-full items-start justify-center self-start bg-[#f2f2f2]",
          multiPage ? "gap-4" : null,
          multiPage && !hostMeasured && "invisible",
        )}
        aria-hidden={multiPage && !hostMeasured ? true : undefined}
      >
        {multiPage ? (
          <PaperPeekCarousel
            props={props}
            pageSlices={pageSlices}
            activeIndex={safeIndex}
            onActiveIndexChange={setActiveIndex}
            availableWidth={carouselAvailableWidth}
            availableHeight={hostSize.height}
          />
        ) : (
          <div className="flex w-full flex-col items-center px-4 py-6 sm:px-6">
            <div className="flex w-full flex-col items-center p-3">
              <CustomerPaperSheet {...props} pageSlice={pageSlices[0]} />
            </div>
          </div>
        )}

        {multiPage ? (
          <nav
            aria-label={ADMIN_REQUESTS_COPY.paperPagesNav}
            className="flex shrink-0 flex-col gap-2 overflow-visible px-1 pb-4 pr-2"
            style={{ paddingTop: OUTER_GUTTER_PX }}
          >
            {pageSlices.map((pageSlice, index) => (
              <PaperThumbnail
                key={`${pageSlice.pageLabel ?? "page"}-${index}`}
                props={props}
                pageSlice={pageSlice}
                pageNumber={index + 1}
                pageCount={pageSlices.length}
                selected={index === safeIndex}
                onSelect={() => setActiveIndex(index)}
              />
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
