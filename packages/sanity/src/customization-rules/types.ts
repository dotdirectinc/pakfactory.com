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
  /**
   * How many of this type's options a customer orders (`customizationType.customerSelects`).
   * Only a `many` type's picks are checked against each other; absent reads as `one`.
   */
  customerSelects?: 'one' | 'many';
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

/**
 * A per-product override of what the rules derive (PROD-2595, ADR-022 decision 7).
 *
 * Only for options whose type ANOTHER customization decides: a product-decided option is
 * already the product's to list or not, in `availableCustomizations`.
 *
 * `add`    — the rules do not derive this option, but this product does offer it.
 * `remove` — the rules derive it, but this product cannot take it.
 *
 * Sanity cannot tell a physically impossible pairing from one nobody has drawn (both are a
 * missing pair in `compatibleCustomizations`), so an `add` is never blocked here — it is
 * reported, and Studio warns on every one.
 */
export interface CustomizationException {
  optionId: string;
  mode: 'add' | 'remove';
  reason?: string;
}

export interface ProductDoc {
  _id: string;
  availableCustomizations?: ProductAvailableCustomization[];
  customizationExceptions?: CustomizationException[];
}

export interface Catalog {
  types: CustomizationTypeDoc[];
  options: CustomizationOptionDoc[];
}
