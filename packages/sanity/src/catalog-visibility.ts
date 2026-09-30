/**
 * TS mirrors of catalog GROQ visibility (`LISTED_STATUS`, `LINE_STYLE_*`,
 * `CUSTOMER_FACING`) plus type-specific chrome/list gates. Keep in sync with
 * `packages/sanity/src/queries/catalog.ts` — do not invent a third matrix in apps.
 */

export type CatalogVisibilityTarget = {
  _type?: string | null;
  status?: string | null;
  customerFacing?: boolean | null;
  hasPage?: boolean | null;
};

/** Mirror GROQ `CUSTOMER_FACING` — unset counts as visible. */
export function isCustomerFacingVisible(
  customerFacing: boolean | null | undefined,
): boolean {
  return customerFacing !== false;
}

/**
 * Mirror GROQ `LISTED_STATUS` — unset / active / coming-soon.
 * Used for products, options, expertise stages, bundles.
 */
export function isListedCatalogStatus(
  status: string | null | undefined,
): boolean {
  if (status == null || status === '') return true;
  return status === 'active' || status === 'coming-soon';
}

/** Mirror GROQ `LINE_STYLE_ACTIVE` — unset / active only (coming-soon hidden). */
export function isLineStyleActiveStatus(
  status: string | null | undefined,
): boolean {
  if (status == null || status === '') return true;
  return status === 'active';
}

/** Mirror GROQ `LINE_STYLE_VISIBLE`. */
export function isLineStyleVisible(
  status: string | null | undefined,
  customerFacing: boolean | null | undefined,
): boolean {
  return isLineStyleActiveStatus(status) && isCustomerFacingVisible(customerFacing);
}

/**
 * Whether a document may appear in www chrome listings / nav when the target
 * shape is known. Unknown `_type` passes through (non-catalog links).
 */
export function isCatalogTargetVisible(
  doc: CatalogVisibilityTarget | null | undefined,
): boolean {
  if (!doc?._type) return true;

  switch (doc._type) {
    case 'productLine':
    case 'productStyle':
      return isLineStyleVisible(doc.status, doc.customerFacing);
    case 'product':
    case 'bundle':
      return (
        isListedCatalogStatus(doc.status) &&
        isCustomerFacingVisible(doc.customerFacing)
      );
    case 'customizationOption':
    case 'expertiseService':
      return (
        doc.hasPage === true &&
        isListedCatalogStatus(doc.status) &&
        isCustomerFacingVisible(doc.customerFacing)
      );
    case 'expertiseStage':
      return isListedCatalogStatus(doc.status);
    case 'solution':
      return doc.hasPage === true;
    default:
      return true;
  }
}
