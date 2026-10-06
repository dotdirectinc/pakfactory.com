"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { formatAnnualSpendDisplay } from "@pakfactory/request/annual-spend";
import type { RequestDraft, RequestLine } from "@pakfactory/request/request";
import { formatAddressLines } from "@pakfactory/request/shipping-address";
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

export type LineCustomizationPick = {
  label: string;
  properties?: string[];
};

export type LineCustomizationGroup = {
  categoryTitle: string;
  picks: LineCustomizationPick[];
};

export type RequestReviewPaperProps = {
  draft: RequestDraft;
  lines: RequestLine[];
  displayRef: string;
  documentDate: string;
  copy: RequestReviewCopy;
  productTitle?: (slug: string) => string;
  /** Resolve stored service id (stage slug) to a display label. */
  serviceLabel?: (id: string) => string;
  /**
   * Optional richer customization groups (category + properties).
   * When omitted, groups fall back to `line.customizations` by category slug.
   */
  lineCustomizationGroups?: (line: RequestLine) => LineCustomizationGroup[];
  /** Optional size line shown first under Customization. */
  lineDimension?: (line: RequestLine) => string | undefined;
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

/** POC letter elevation — bypass monorepo --shadow-2xl theme remap (same-name self-ref). */
const PAPER_ELEVATION_CLASS =
  "shadow-[0_25px_50px_-12px_rgb(0_0_0_/_0.25)] ring-1 ring-black/5";

function paperDensityClasses(density: RequestReviewPaperDensity = "default") {
  const isTight = density === "tight";
  return {
    // Default matches POC ProjectWizardV2: px-10 py-12 sm:px-14
    innerPadding: isTight
      ? "px-4 py-4 sm:px-6 sm:py-6"
      : "px-10 py-12 sm:px-14",
    letterheadBottomPad: isTight ? "pb-3" : "pb-4",
    letterheadTitle: isTight ? "text-[14px]" : "text-[15px]",
    letterheadMeta: isTight ? "text-[11.5px]" : "text-[12.5px]",
    sectionLabel: isTight ? "text-[10px]" : "text-[10.5px]",
    body: isTight ? "text-[12px]" : "text-[13px]",
    secondary: isTight ? "text-[11.5px]" : "text-[12.5px]",
    disclaimer: isTight ? "text-[11px]" : "text-[12px]",
    sectionTopMargin: isTight ? "mt-4" : "mt-5",
    contactBottomPad: isTight ? "pb-4" : "pb-5",
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
      className="h-auto shrink-0 p-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
    >
      {copy.paperEdit}
    </Button>
  );
}

/** Group flat customizations by category slug when no richer formatter is passed. */
function fallbackCustomizationGroups(
  line: RequestLine,
): LineCustomizationGroup[] {
  const order: string[] = [];
  const byCategory = new Map<string, LineCustomizationPick[]>();

  for (const customization of line.customizations) {
    const key = customization.category?.trim() || "other";
    if (!byCategory.has(key)) {
      order.push(key);
      byCategory.set(key, []);
    }
    byCategory.get(key)!.push({label: customization.label});
  }

  return order.map((key) => ({
    categoryTitle: key,
    picks: byCategory.get(key) ?? [],
  }));
}

function formatPickLabel(pick: LineCustomizationPick): string {
  const props = (pick.properties ?? []).filter(Boolean);
  if (props.length === 0) return pick.label;
  return `${pick.label} (${props.join(", ")})`;
}

function LineCustomizationCell({
  copy,
  groups,
  dimension,
  bodyClass,
  secondaryClass,
}: {
  copy: RequestReviewCopy;
  groups: LineCustomizationGroup[];
  /** Real size summary only; omit when unset so empty lines collapse. */
  dimension?: string;
  bodyClass: string;
  secondaryClass: string;
}) {
  const dimensionValue = dimension?.trim() ?? "";
  const dimensionSet = dimensionValue.length > 0;

  if (!dimensionSet && groups.length === 0) {
    return (
      <span className={cn(bodyClass, "text-muted-foreground")}>
        {copy.specialistToAdvise}
      </span>
    );
  }

  return (
    <div className={cn("space-y-2", bodyClass, "text-muted-foreground")}>
      <div>
        <p
          className={cn(secondaryClass, "font-semibold text-foreground")}
        >
          {copy.paperDimensionsLabel}
        </p>
        <p className="mt-0.5">
          {dimensionSet ? dimensionValue : copy.specialistToAdvise}
        </p>
      </div>
      {groups.map((group) => (
        <div key={group.categoryTitle}>
          <p
            className={cn(secondaryClass, "font-semibold text-foreground")}
          >
            {group.categoryTitle}
          </p>
          <p className="mt-0.5">
            {group.picks.length > 0
              ? group.picks.map(formatPickLabel).join(", ")
              : copy.specialistToAdvise}
          </p>
        </div>
      ))}
    </div>
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
        <p className={cn("mt-0.5 text-muted-foreground", d.letterheadMeta)}>
          {documentDate}
        </p>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70">
          {copy.refLabel} {displayRef}
        </p>
        {pageLabel ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground/70">{pageLabel}</p>
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
  serviceLabel: (id: string) => string;
  lineCustomizationGroups?: (line: RequestLine) => LineCustomizationGroup[];
  lineDimension?: (line: RequestLine) => string | undefined;
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
  serviceLabel,
  lineCustomizationGroups,
  lineDimension,
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
  const showServices =
    draft.servicesEnabled && draft.services.length > 0;

  return (
    <>
      {showContactBlock ? (
        <div
          className={cn(
            "grid grid-cols-1 gap-x-10 gap-y-4 border-b border-dashed border-[#E9E9E7] sm:grid-cols-2",
            compact ? "mt-0 pb-4" : cn(d.sectionTopMargin, d.contactBottomPad),
          )}
        >
          <div className="min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <p
                className={cn(
                  d.sectionLabel,
                  "min-w-0 font-semibold uppercase tracking-[0.06em] text-muted-foreground",
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
          <div className="min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <p
                className={cn(
                  d.sectionLabel,
                  "min-w-0 font-semibold uppercase tracking-[0.06em] text-muted-foreground",
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
                  className={cn(d.body, "text-muted-foreground first:mt-1")}
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
      ) : null}

      {lines.length === 0 ? null : (
        <table
          className={cn(
            "w-full table-fixed border-collapse text-left",
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
                  "w-[18%] pb-2 pr-3 align-bottom font-semibold uppercase tracking-[0.06em] text-muted-foreground",
                  d.sectionLabel,
                )}
              >
                {copy.paperQty}
              </th>
              <th
                className={cn(
                  "w-[32%] pb-2 pr-3 align-bottom font-semibold uppercase tracking-[0.06em] text-muted-foreground",
                  d.sectionLabel,
                )}
              >
                {copy.paperItem}
              </th>
              <th
                className={cn(
                  "w-[50%] pb-2 align-bottom font-semibold uppercase tracking-[0.06em] text-muted-foreground",
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
              const qtyValues = line.quantities.map((n) =>
                n.toLocaleString("en-US"),
              );
              const contents = line.contents?.trim() ?? "";
              const notes = line.notes?.trim() ?? "";
              const dimension = lineDimension?.(line)?.trim() ?? "";
              const groups =
                lineCustomizationGroups?.(line) ??
                fallbackCustomizationGroups(line);
              return (
                <tr
                  key={line.id}
                  className="border-b border-dashed border-[#F1F1EF] align-top last:border-b-0"
                >
                  <td className={cn(d.tableRowPad, "w-[18%] pr-3 font-medium")}>
                    <div className="flex flex-col">
                      {qtyValues.map((value, index) => (
                        <span key={`${line.id}-qty-${index}`}>{value}</span>
                      ))}
                    </div>
                  </td>
                  <td className={cn(d.tableRowPad, "w-[32%] pr-3 font-medium")}>
                    <div className="space-y-1">
                      <p className={d.body}>{title}</p>
                      {contents ? (
                        <p
                          className={cn(
                            d.secondary,
                            "font-normal text-muted-foreground",
                          )}
                        >
                          {copy.paperProductPrefix} {contents}
                        </p>
                      ) : null}
                      {notes ? (
                        <p
                          className={cn(
                            d.secondary,
                            "font-normal text-muted-foreground",
                          )}
                        >
                          {copy.paperDetailPrefix} {notes}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className={cn(d.tableRowPad, "min-w-0 w-[50%]")}>
                    <LineCustomizationCell
                      copy={copy}
                      groups={groups}
                      dimension={dimension || undefined}
                      bodyClass={d.body}
                      secondaryClass={d.secondary}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showServices ? (
        <div
          className={cn(
            "border-t border-dashed border-[#E9E9E7]",
            d.sectionTopMargin,
            d.briefTopPad,
          )}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <p
              className={cn(
                d.sectionLabel,
                "min-w-0 font-semibold uppercase tracking-[0.06em] text-muted-foreground",
              )}
            >
              {copy.paperServices}
            </p>
            {showEdit ? (
              <PaperEditLink
                copy={copy}
                onClick={() => onEditSection!("services")}
              />
            ) : null}
          </div>
          <ul className={cn("mt-1 list-none space-y-0.5", d.body)}>
            {draft.services.map((id) => (
              <li key={id}>{serviceLabel(id)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {showBriefBlock ? (
      <div
        className={cn(
          "border-t border-dashed border-[#E9E9E7]",
          d.sectionTopMargin,
          d.briefTopPad,
        )}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <p
            className={cn(
              d.sectionLabel,
              "min-w-0 font-semibold uppercase tracking-[0.06em] text-muted-foreground",
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
  serviceLabel = (id) => id,
  lineCustomizationGroups,
  lineDimension,
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
          serviceLabel={serviceLabel}
          lineCustomizationGroups={lineCustomizationGroups}
          lineDimension={lineDimension}
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
        "relative z-0 mx-auto w-full rounded-md bg-white text-foreground",
        PAPER_ELEVATION_CLASS,
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
          serviceLabel={serviceLabel}
          lineCustomizationGroups={lineCustomizationGroups}
          lineDimension={lineDimension}
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
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          {documentDate}
        </p>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/70">
          {copy.refLabel} {displayRef}
        </p>
      </div>
    </div>
  );
}
