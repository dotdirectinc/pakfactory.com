"use client";

import type { ReactNode } from "react";
import {
  RequestReviewPaper,
  type RequestReviewPageSlice,
} from "@pakfactory/brief-builder-ui/request-review-paper";
import { DEFAULT_REQUEST_REVIEW_COPY } from "@pakfactory/brief-builder-ui/request-review-copy";
import type { RequestDraft, RequestLine } from "@pakfactory/domain/request";
import { cn } from "@pakfactory/ui/lib/utils";

const LETTER_PAPER_CLASS =
  "aspect-[8.5/11] w-full max-w-full shrink-0 overflow-hidden shadow-lg";

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

  const splitIndex = Math.max(1, Math.ceil(lines.length / 2));
  const page1Lines = lines.slice(0, splitIndex);
  const page2Lines = lines.slice(splitIndex);

  return [
    {
      lines: page1Lines,
      showContactBlock: true,
      showBriefBlock: false,
      showDisclaimer: false,
    },
    {
      lines: page2Lines,
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
}: RequestDetailCustomerPaperStackProps & {
  pageSlice: RequestReviewPageSlice;
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
      className={LETTER_PAPER_CLASS}
    />
  );
}

export function RequestDetailCustomerPaperStack({
  className,
  ...props
}: RequestDetailCustomerPaperStackProps & { className?: string }) {
  const { draft, lines } = props;
  const pageSlices = buildPageSlices(draft, lines);

  return (
    <div
      className={cn(
        "flex h-full min-h-[min(70vh,800px)] w-full flex-col bg-[#f2f2f2] xl:min-h-0 xl:bg-transparent",
        className,
      )}
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[43rem] flex-col items-center justify-center gap-6 overflow-y-auto px-6 pb-6 pt-6 xl:pt-0">
        {pageSlices.map((pageSlice, index) => (
          <CustomerPaperSheet
            key={`${pageSlice.pageLabel ?? "page"}-${index}`}
            {...props}
            pageSlice={pageSlice}
          />
        ))}
      </div>
    </div>
  );
}
