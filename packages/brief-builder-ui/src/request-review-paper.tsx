"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { formatAnnualSpendDisplay } from "@pakfactory/domain/annual-spend";
import type { RequestDraft, RequestLine } from "@pakfactory/domain/request";
import { formatAddressLines } from "@pakfactory/domain/shipping-address";
import { Button } from "@pakfactory/ui/components/button";
import { cn } from "@pakfactory/ui/lib/utils";
import type { RequestReviewCopy } from "./request-review-copy";

export type RequestReviewPageSlice = {
  /** Product lines shown on this sheet */
  lines: RequestLine[];
  /** Prepared-for / shipped-to block (default true when pageSlice omitted) */
  showContactBlock?: boolean;
  /** Brief, timeline, packaging footer block */
  showBriefBlock?: boolean;
  /** Disclaimer footnote */
  showDisclaimer?: boolean;
  /** e.g. "Page 2 of 2" shown under the ref in the letterhead */
  pageLabel?: string;
};

export type RequestReviewPaperDensity = "default" | "tight";

export type RequestReviewPaperProps = {
  draft: RequestDraft;
  lines: RequestLine[];
  displayRef: string;
  documentDate: string;
  copy: RequestReviewCopy;
  productTitle?: (slug: string) => string;
  logoSlot?: ReactNode;
  mode?: "interactive" | "readonly";
  onEditSection?: (key: string) => void;
  compact?: boolean;
  density?: RequestReviewPaperDensity;
  pageSlice?: RequestReviewPageSlice;
  className?: string;
  paperRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
};

function paperDensityClasses(density: RequestReviewPaperDensity = "default") {
  const isTight = density === "tight";
  return {
    innerPadding: isTight
      ? "px-4 py-4 sm:px-6 sm:py-6"
      : "px-4 py-6 sm:px-10 sm:py-12 lg:px-14",
    letterheadBottomPad: isTight ? "pb-3" : "pb-4",
    letterheadTitle: isTight ? "text-[14px]" : "text-[15px]",
    letterheadMeta: isTight ? "text-[11.5px]" : "text-[12.5px]",
    sectionLabel: isTight ? "text-[10px]" : "text-[10.5px]",
    body: isTight ? "text-[12px]" : "text-[13px]",
    secondary: isTight ? "text-[11.5px]" : "text-[12.5px]",
    disclaimer: isTight ? "text-[11px]" : "text-[12px]",
    sectionTopMargin: isTight ? "mt-4" : "mt-5",
    tableRowPad: isTight ? "py-2" : "py-3",
    briefTopPad: isTight ? "pt-3" : "pt-4",
    disclaimerPad: isTight ? "px-3 py-2" : "px-4 py-3",
  };
}

function isExpressRequirementsOnly(draft: RequestDraft): boolean {
  return draft.express && !draft.productsExpanded;
}

function PaperEditLink({
  copy,
  onClick,
}: {
  copy: RequestReviewCopy;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="link"
      onClick={onClick}
      className="h-auto p-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
    >
      {copy.paperEdit}
    </Button>
  );
}

function ReviewLetterhead({
  copy,
  displayRef,
  documentDate,
  logoSlot,
  pageLabel,
  density = "default",
}: {
  copy: RequestReviewCopy;
  displayRef: string;
  documentDate: string;
  logoSlot?: ReactNode;
  pageLabel?: string;
  density?: RequestReviewPaperDensity;
}) {
  const d = paperDensityClasses(density);

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-dashed border-[#E9E9E7]",
        d.letterheadBottomPad,
      )}
    >
      <div className="flex items-center gap-2.5">
        {logoSlot}
        <div className="leading-tight">
          <p className={cn(d.letterheadTitle, "font-semibold tracking-tight")}>
            {copy.letterheadName}
          </p>
          <p className={cn(d.letterheadMeta, "text-muted-foreground")}>
            {copy.letterheadTagline}
          </p>
        </div>
      </div>
      <div className="text-right leading-tight">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
          {copy.reviewPaperBadge}
        </p>
        <p className={cn("mt-1 text-muted-foreground", d.letterheadMeta)}>
          {documentDate}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70">
          {copy.refLabel} {displayRef}
        </p>
        {pageLabel ? (
          <p className="mt-1 text-[10px] text-muted-foreground/70">{pageLabel}</p>
        ) : null}
      </div>
    </div>
  );
}

type ReviewSummaryBodyProps = {
  draft: RequestDraft;
  lines: RequestLine[];
  copy: RequestReviewCopy;
  toName: string;
  shippingLines: string[];
  officeLines: string[];
  spendDisplay: string;
  briefText: string;
  productTitle: (slug: string) => string;
  mode: "interactive" | "readonly";
  onEditSection?: (key: string) => void;
  compact?: boolean;
  density?: RequestReviewPaperDensity;
  showContactBlock?: boolean;
  showBriefBlock?: boolean;
  showDisclaimer?: boolean;
};

function ReviewSummaryBody({
  draft,
  lines,
  copy,
  toName,
  shippingLines,
  officeLines,
  spendDisplay,
  briefText,
  productTitle,
  mode,
  onEditSection,
  compact = false,
  density = "default",
  showContactBlock = true,
  showBriefBlock = true,
  showDisclaimer = true,
}: ReviewSummaryBodyProps) {
  const showEdit = mode === "interactive" && onEditSection;
  const d = paperDensityClasses(density);

  return (
    <>
      {showContactBlock ? (
        <>
          <div
            className={cn(
              "grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2",
              compact ? "mt-0" : d.sectionTopMargin,
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    d.sectionLabel,
                    "font-semibold uppercase tracking-[0.06em] text-muted-foreground",
                  )}
                >
                  {copy.preparedFor}
                </p>
                {showEdit ? (
                  <PaperEditLink
                    copy={copy}
                    onClick={() => onEditSection!("information")}
                  />
                ) : null}
              </div>
              <p className={cn("mt-1 font-medium", d.body)}>{toName}</p>
              {draft.contactCompany ? (
                <p className={cn(d.body, "text-muted-foreground")}>
                  {draft.contactCompany}
                </p>
              ) : null}
              <p className={cn(d.body, "text-muted-foreground")}>
                {draft.contactEmail || "—"}
              </p>
              {draft.contactPhone ? (
                <p className={cn(d.body, "text-muted-foreground")}>
                  {draft.contactPhone}
                </p>
              ) : null}
              {officeLines.length ? (
                <p className={cn(d.body, "text-muted-foreground")}>
                  {officeLines.join(" · ")}
                </p>
              ) : null}
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    d.sectionLabel,
                    "font-semibold uppercase tracking-[0.06em] text-muted-foreground",
                  )}
                >
                  {copy.shippedToAddress}
                </p>
                {showEdit ? (
                  <PaperEditLink
                    copy={copy}
                    onClick={() => onEditSection!("requirements")}
                  />
                ) : null}
              </div>
              {shippingLines.length ? (
                shippingLines.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className={cn(
                      d.body,
                      "text-muted-foreground first:mt-1",
                    )}
                  >
                    {line}
                  </p>
                ))
              ) : (
                <p className={cn("mt-1 text-muted-foreground", d.body)}>
                  {copy.regionToConfirm}
                </p>
              )}
              {spendDisplay ? (
                <p className={cn("mt-2 text-muted-foreground", d.body)}>
                  {copy.budgetOnPaper} {spendDisplay}
                </p>
              ) : null}
              {draft.contactIndustry ? (
                <p className={cn(d.body, "text-muted-foreground")}>
                  {draft.contactIndustry}
                </p>
              ) : null}
            </div>
          </div>
          <div
            className={cn(
              "border-b border-dashed border-[#E9E9E7]",
              d.sectionTopMargin,
            )}
            aria-hidden
          />
        </>
      ) : null}

      {lines.length === 0 ? (
        showContactBlock ? (
          <p
            className={cn(
              d.body,
              "text-muted-foreground",
              compact ? "mt-0" : d.sectionTopMargin,
            )}
          >
            {copy.noProductsAdded}
          </p>
        ) : null
      ) : (
        <table
          className={cn(
            "w-full border-collapse text-left",
            d.body,
            showContactBlock
              ? d.sectionTopMargin
              : compact
                ? "mt-0"
                : d.sectionTopMargin,
          )}
        >
          <thead>
            <tr className="border-b border-dashed border-[#E9E9E7]">
              <th
                className={cn(
                  "w-24 pb-2 align-bottom font-semibold uppercase tracking-[0.06em] text-muted-foreground",
                  d.sectionLabel,
                )}
              >
                {copy.paperQty}
              </th>
              <th
                className={cn(
                  "pb-2 align-bottom font-semibold uppercase tracking-[0.06em] text-muted-foreground",
                  d.sectionLabel,
                )}
              >
                {copy.paperItem}
              </th>
              <th
                className={cn(
                  "pb-2 align-bottom font-semibold uppercase tracking-[0.06em] text-muted-foreground",
                  d.sectionLabel,
                )}
              >
                {copy.paperConfiguration}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const title = productTitle(line.productSlug);
              const qty = line.quantities
                .map((n) => n.toLocaleString("en-US"))
                .join(", ");
              const config =
                [
                  line.contents,
                  ...line.customizations.map((customization) => customization.label),
                  line.notes,
                ]
                  .filter(Boolean)
                  .join(" · ") || copy.specialistToAdvise;
              return (
                <tr
                  key={line.id}
                  className="border-b border-dashed border-[#E9E9E7] align-top last:border-b-0"
                >
                  <td className={cn(d.tableRowPad, "pr-3 font-medium")}>
                    {qty}
                  </td>
                  <td className={cn(d.tableRowPad, "pr-3 font-medium")}>
                    {title}
                  </td>
                  <td className={cn(d.tableRowPad, "text-muted-foreground")}>
                    {config}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showBriefBlock ? (
      <div
        className={cn(
          "border-t border-dashed border-[#E9E9E7]",
          d.sectionTopMargin,
          d.briefTopPad,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              d.sectionLabel,
              "font-semibold uppercase tracking-[0.06em] text-muted-foreground",
            )}
          >
            {copy.paperBrief}
          </p>
          {showEdit ? (
            <PaperEditLink
              copy={copy}
              onClick={() => onEditSection!("requirements")}
            />
          ) : null}
        </div>
        <p className={cn("mt-1 whitespace-pre-wrap break-words", d.body)}>
          {briefText || copy.notSet}
        </p>
        {draft.timeline.trim() ? (
          <p className={cn("mt-1 text-muted-foreground", d.secondary)}>
            {copy.timeFramePrefix} {draft.timeline.trim()}
          </p>
        ) : null}
        {draft.packagingContents ? (
          <p className={cn("mt-1 text-muted-foreground", d.secondary)}>
            {copy.packagingPrefix} {draft.packagingContents}
          </p>
        ) : null}
        {isExpressRequirementsOnly(draft) &&
        draft.expressQuantities.length > 0 ? (
          <p className={cn("mt-1 text-muted-foreground", d.secondary)}>
            {copy.quantityPrefix}{" "}
            {draft.expressQuantities
              .map((n) => n.toLocaleString("en-US"))
              .join(", ")}{" "}
            {copy.unitsSuffix}
          </p>
        ) : null}
      </div>
      ) : null}

      {showDisclaimer ? (
      <p
        className={cn(
          "rounded-md bg-muted/50 leading-relaxed text-muted-foreground",
          d.disclaimer,
          d.disclaimerPad,
          compact ? "mt-6" : "mt-auto",
        )}
      >
        {copy.paperDisclaimer}
      </p>
      ) : null}
    </>
  );
}

export function RequestReviewPaper({
  draft,
  lines,
  displayRef,
  documentDate,
  copy,
  productTitle = (slug) => slug,
  logoSlot,
  mode = "readonly",
  onEditSection,
  compact = false,
  density = "default",
  pageSlice,
  className,
  paperRef,
  style,
}: RequestReviewPaperProps) {
  const toName =
    `${draft.contactFirstName} ${draft.contactLastName}`.trim() || "—";
  const shippingLines = formatAddressLines(draft.shippingAddress);
  const officeLines = formatAddressLines(draft.companyAddress);
  const spendDisplay = formatAnnualSpendDisplay(draft.annualSpend);
  const briefText = draft.notes.trim();

  const displayLines = pageSlice?.lines ?? lines;
  const showContactBlock = pageSlice?.showContactBlock ?? true;
  const showBriefBlock = pageSlice?.showBriefBlock ?? true;
  const showDisclaimer = pageSlice?.showDisclaimer ?? true;
  const pageLabel = pageSlice?.pageLabel;

  const d = paperDensityClasses(density);
  const innerPadding = compact ? "px-0 py-0" : d.innerPadding;

  if (compact) {
    return (
      <div className={className}>
        <ReviewSummaryBody
          draft={draft}
          lines={displayLines}
          copy={copy}
          toName={toName}
          shippingLines={shippingLines}
          officeLines={officeLines}
          spendDisplay={spendDisplay}
          briefText={briefText}
          productTitle={productTitle}
          mode={mode}
          onEditSection={onEditSection}
          compact
          showContactBlock={showContactBlock}
          showBriefBlock={showBriefBlock}
          showDisclaimer={showDisclaimer}
        />
      </div>
    );
  }

  return (
    <div
      ref={paperRef}
      className={cn(
        "relative z-0 mx-auto w-full rounded-md bg-white text-foreground shadow-2xl ring-1 ring-black/5",
        className,
      )}
      style={style}
    >
      <div className={cn("flex h-full flex-col overflow-hidden", innerPadding)}>
        <ReviewLetterhead
          copy={copy}
          displayRef={displayRef}
          documentDate={documentDate}
          logoSlot={logoSlot}
          pageLabel={pageLabel}
          density={density}
        />
        <ReviewSummaryBody
          draft={draft}
          lines={displayLines}
          copy={copy}
          toName={toName}
          shippingLines={shippingLines}
          officeLines={officeLines}
          spendDisplay={spendDisplay}
          briefText={briefText}
          productTitle={productTitle}
          mode={mode}
          onEditSection={onEditSection}
          density={density}
          showContactBlock={showContactBlock}
          showBriefBlock={showBriefBlock}
          showDisclaimer={showDisclaimer}
        />
      </div>
    </div>
  );
}

/** Letterhead block without the paper card — for mobile summary sheet header. */
export function RequestReviewSheetHeader({
  copy,
  displayRef,
  documentDate,
}: {
  copy: RequestReviewCopy;
  displayRef: string;
  documentDate: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4 border-b border-dashed border-[#E9E9E7] pb-4">
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-tight">
          {copy.letterheadName}
        </p>
        <p className="text-[12.5px] text-muted-foreground">
          {copy.letterheadTagline}
        </p>
      </div>
      <div className="text-right leading-tight">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
          {copy.reviewPaperBadge}
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {documentDate}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70">
          {copy.refLabel} {displayRef}
        </p>
      </div>
    </div>
  );
}
