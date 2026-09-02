import type { RequestReviewCopy } from "@pakfactory/brief-builder-ui/request-review-copy";
import { REQUEST_COPY } from "@/lib/copy/request";

export function getRequestReviewCopy(): RequestReviewCopy {
  return {
    letterheadName: REQUEST_COPY.letterheadName,
    letterheadTagline: REQUEST_COPY.letterheadTagline,
    reviewPaperBadge: REQUEST_COPY.reviewPaperBadge,
    refLabel: REQUEST_COPY.refLabel,
    preparedFor: REQUEST_COPY.preparedFor,
    shippedToAddress: REQUEST_COPY.shippedToAddress,
    paperEdit: REQUEST_COPY.paperEdit,
    paperBrief: REQUEST_COPY.paperBrief,
    paperQty: REQUEST_COPY.paperQty,
    paperItem: REQUEST_COPY.paperItem,
    paperConfiguration: REQUEST_COPY.paperConfiguration,
    noProductsAdded: REQUEST_COPY.noProductsAdded,
    regionToConfirm: REQUEST_COPY.regionToConfirm,
    notSet: REQUEST_COPY.notSet,
    paperDisclaimer: REQUEST_COPY.paperDisclaimer,
    timeFramePrefix: REQUEST_COPY.timeFramePrefix,
    packagingPrefix: REQUEST_COPY.packagingPrefix,
    quantityPrefix: REQUEST_COPY.quantityPrefix,
    unitsSuffix: REQUEST_COPY.unitsSuffix,
    budgetOnPaper: REQUEST_COPY.budgetOnPaper,
    specialistToAdvise: REQUEST_COPY.specialistToAdvise,
  };
}
