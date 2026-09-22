/**
 * The Sanity shape the customization rules are computed from (PROD-2557).
 *
 * These mirror three fields and nothing else, so that Studio, www and admin can
 * all hand the same thing to the same function:
 *
 *   customizationType.availabilityDecidedBy   PROD-2532
 *   customizationOption.compatibleCustomizations  PROD-2534
 *   product.availableCustomizations           PROD-2529
 *
 * They are deliberately NOT the documents. A caller projects its own GROQ into
 * these, which keeps the rules independent of how each app fetches, and keeps the
 * tests free of Sanity altogether.
 *
 * Dependency DIRECTION is not here on purpose. The compatibility field is a flat,
 * symmetric list of pairs — "recording it on either option is enough" — so it
 * cannot say which side restricts which. Direction arrives as an argument to the
 * functions that need it, from `customizationType.dependsOn` once PROD-2558 adds
 * it. Until then a caller passes the graph explicitly; the rules never guess.
 */

/**
 * Who decides whether a product offers the options of a type (PROD-2532).
 *
 * `product` — the product lists them, under "Available customizations". Materials
 *             and Additional Customization.
 * `customization` — the material or process it goes on decides instead, so these
 *             never appear on the product. Most of Finishing, all of Printing.
 */
export type AvailabilityDecidedBy = 'product' | 'customization';

export interface CustomizationTypeDoc {
  _id: string;
  title?: string;
  availabilityDecidedBy: AvailabilityDecidedBy;
}

export interface CustomizationOptionDoc {
  _id: string;
  title?: string;
  /** The Customization Type this option belongs to. */
  typeId: string;
  /**
   * References to other customizationOption documents. Symmetric, and EMPTY
   * MEANS NOTHING IS COMPATIBLE (PROD-2534) — see `eligibleOptions`.
   */
  compatibleCustomizations?: string[];
}

export interface ProductAvailableCustomization {
  optionId: string;
  /** Only meaningful on an Inspiration preset; inert on a Standard product. */
  preselected?: boolean;
}

export interface ProductDoc {
  _id: string;
  availableCustomizations?: ProductAvailableCustomization[];
}

export interface Catalog {
  types: CustomizationTypeDoc[];
  options: CustomizationOptionDoc[];
}
