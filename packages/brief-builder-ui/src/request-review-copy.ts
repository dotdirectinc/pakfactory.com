export type RequestReviewCopy = {
  letterheadName: string;
  letterheadTagline: string;
  reviewPaperBadge: string;
  refLabel: string;
  preparedFor: string;
  shippedToAddress: string;
  paperEdit: string;
  paperBrief: string;
  paperQty: string;
  paperItem: string;
  paperConfiguration: string;
  noProductsAdded: string;
  regionToConfirm: string;
  notSet: string;
  paperDisclaimer: string;
  timeFramePrefix: string;
  packagingPrefix: string;
  quantityPrefix: string;
  unitsSuffix: string;
  budgetOnPaper: string;
  specialistToAdvise: string;
};

export const DEFAULT_REQUEST_REVIEW_COPY: RequestReviewCopy = {
  letterheadName: "PakFactory",
  letterheadTagline: "Custom packaging quotes",
  reviewPaperBadge: "Quote request",
  refLabel: "Ref",
  preparedFor: "Prepared for",
  shippedToAddress: "Shipped to Address",
  paperEdit: "Edit",
  paperBrief: "Brief",
  paperQty: "Qty",
  paperItem: "Item",
  paperConfiguration: "Configuration",
  noProductsAdded: "No products added.",
  regionToConfirm: "Region — to confirm",
  notSet: "Not set",
  paperDisclaimer:
    "This is a request, not a quote. We'll reply within one business day.",
  timeFramePrefix: "Time frame:",
  packagingPrefix: "Packaging:",
  quantityPrefix: "Quantity:",
  unitsSuffix: "units",
  budgetOnPaper: "Yearly Packaging Spend",
  specialistToAdvise: "Specialist to advise",
};
