"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  RequestReviewPaper,
  type RequestReviewPageSlice,
} from "@pakfactory/brief-builder-ui/request-review-paper";
import { DEFAULT_REQUEST_REVIEW_COPY } from "@pakfactory/brief-builder-ui/request-review-copy";
import type { RequestDraft, RequestLine } from "@pakfactory/domain/request";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@pakfactory/ui/components/carousel";
import { cn } from "@pakfactory/ui/lib/utils";
import { ADMIN_REQUESTS_COPY } from "@/lib/copy/requests";

/**
 * Omnidirectional soft shadow for the admin viewer.
 * RequestReviewPaper defaults to shadow-2xl (mostly downward) which reads as
 * "cut off" on the top edge even when the clip pad is large enough.
 */
const VIEWER_PAPER_SHADOW_CLASS =
  "!shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_28px_rgba(0,0,0,0.14),0_2px_6px_rgba(0,0,0,0.06)]";

/** Fixed letter frame — full grey height minus shadow gutter only. */
const LETTER_FIT_CLASS =
  "aspect-[8.5/11] h-auto max-h-[calc(100dvh-68px-3rem)] w-[min(43rem,calc((100dvh-68px-3rem)*8.5/11))] shrink-0";

/** Thumbs sit just right of the centered letter (red-box zone). */
const THUMBS_BESIDE_PAPER_CLASS =
  "absolute top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 left-[calc(50%+min(43rem,(100dvh-68px-3rem)*8.5/11)/2+1rem)]";

/** Thumb sheet fills the fixed button box. */
const LETTER_THUMB_CLASS = "h-full w-full overflow-hidden shadow-none ring-0";

const LETTER_ASPECT = 11 / 8.5;
const THUMB_WIDTH_PX = 72;
const THUMB_SCALE = THUMB_WIDTH_PX / 688;

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

/**
 * Always at least one page — both returns below are literal arrays with a page
 * in them, and a request with nothing to show still renders an empty sheet
 * rather than no sheet.
 *
 * The NON-EMPTY tuple type is what says so to the compiler. Under
 * `noUncheckedIndexedAccess` a plain `RequestReviewPageSlice[]` makes
 * `pageSlices[0]` possibly-undefined, which broke the admin production build
 * (`Type 'RequestReviewPageSlice | undefined' is not assignable`). Stating the
 * invariant here fixes it at the source, where the guarantee actually holds —
 * a `!` at the call site would assert the same thing without anything backing
 * it, and would keep asserting it if a future branch returned [].
 */
function buildPageSlices(
  draft: RequestDraft,
  lines: RequestLine[],
): [RequestReviewPageSlice, ...RequestReviewPageSlice[]] {
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
      className={cn(VIEWER_PAPER_SHADOW_CLASS, className)}
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
        // Always ring-2 + offset so selection never changes layout size.
        "shrink-0 rounded-xs bg-background shadow-sm ring-2 ring-offset-2 ring-offset-[#f2f2f2] transition-shadow focus-visible:outline-none focus-visible:ring-ring",
        selected
          ? "ring-border"
          : "ring-transparent hover:ring-muted-foreground/40",
      )}
      style={{ width: THUMB_WIDTH_PX, height: thumbHeight }}
    >
      <div
        aria-hidden
        className="pointer-events-none origin-top-left overflow-hidden rounded-xs"
        style={{
          width: 688,
          height: Math.round(688 * LETTER_ASPECT),
          transform: `scale(${THUMB_SCALE})`,
        }}
      >
        <CustomerPaperSheet
          {...props}
          pageSlice={pageSlice}
          className={LETTER_THUMB_CLASS}
        />
      </div>
    </button>
  );
}

export function RequestDetailCustomerPaperStack({
  className,
  ...props
}: RequestDetailCustomerPaperStackProps & { className?: string }) {
  const { draft, lines } = props;
  const pageSlices = buildPageSlices(draft, lines);
  const multiPage = pageSlices.length > 1;
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setActiveIndex(carouselApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("reInit", onSelect);
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-[min(70vh,800px)] w-full overflow-hidden xl:min-h-0",
        className,
      )}
    >
      {multiPage ? (
        <>
          <div className="absolute inset-0 min-h-0 min-w-0 [&_[data-slot=carousel-content]]:h-full">
            <Carousel
              orientation="vertical"
              className="h-full w-full"
              setApi={setApi}
              opts={{ loop: false, align: "center" }}
            >
              <CarouselContent className="-mt-0 h-full">
                {pageSlices.map((pageSlice, index) => (
                  <CarouselItem
                    key={`${pageSlice.pageLabel ?? "page"}-${index}`}
                    className="basis-full pt-0"
                  >
                    <div className="flex h-full w-full items-center justify-center p-6">
                      <CustomerPaperSheet
                        {...props}
                        pageSlice={pageSlice}
                        className={LETTER_FIT_CLASS}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>

          <nav
            aria-label={ADMIN_REQUESTS_COPY.paperPagesNav}
            className={THUMBS_BESIDE_PAPER_CLASS}
          >
            {pageSlices.map((pageSlice, index) => (
              <PaperThumbnail
                key={`thumb-${pageSlice.pageLabel ?? "page"}-${index}`}
                props={props}
                pageSlice={pageSlice}
                pageNumber={index + 1}
                pageCount={pageSlices.length}
                selected={index === activeIndex}
                onSelect={() => api?.scrollTo(index)}
              />
            ))}
          </nav>
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center p-6">
          <CustomerPaperSheet
            {...props}
            pageSlice={pageSlices[0]}
            className={LETTER_FIT_CLASS}
          />
        </div>
      )}
    </div>
  );
}
