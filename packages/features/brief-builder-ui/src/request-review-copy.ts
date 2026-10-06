export type RequestReviewCopy = {
  letterheadName: string;
  letterheadTagline: string;
  reviewPaperBadge: string;
  refLabel: string;
  preparedFor: string;
  shippedToAddress: string;
  paperEdit: string;
  paperServices: string;
  paperBrief: string;
  paperQty: string;
  paperItem: string;
  paperConfiguration: string;
  /** Prefix for packaging contents under Item (e.g. "Product:"). */
  paperProductPrefix: string;
  /** Prefix for line notes under Item (e.g. "Detail:"). */
  paperDetailPrefix: string;
  /** Heading for size under Customization (e.g. "Dimensions"). */
  paperDimensionsLabel: string;
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
  paperServices: "Additional Services",
  paperBrief: "Brief",
  paperQty: "Qty",
  paperItem: "Item",
  paperConfiguration: "Customization",
  paperProductPrefix: "Product:",
  paperDetailPrefix: "Detail:",
  paperDimensionsLabel: "Dimensions",
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
