/**
 * Customization rules, computed from Sanity (PROD-2557).
 *
 * One implementation for the three readers — Studio (what an editor is about to
 * change), www (what a customer can pick), admin (what the rules currently say).
 * Three copies of this logic is how they drift.
 *
 * This file holds the part that does not depend on a selection: which options can
 * appear AT ALL, and which ones a given product offers. The selection-dependent
 * cascade — "Colour System works on Offset, Offset works on Paperboard, pick
 * Fabric and both go" — arrives next and builds on these.
 */
import type {
  Catalog,
  CustomizationOptionDoc,
  CustomizationTypeDoc,
  ProductDoc,
} from './types';

export type {
  AvailabilityDecidedBy,
  Catalog,
  CustomizationOptionDoc,
  CustomizationTypeDoc,
  ProductAvailableCustomization,
  ProductDoc,
} from './types';

export interface CompatibilityIndex {
  /** option id → the option ids it is compatible with. Symmetric. */
  pairs: ReadonlyMap<string, ReadonlySet<string>>;
  /**
   * References that name no option in the catalog, as `${optionId} → ${missingId}`.
   *
   * Surfaced rather than swallowed, because of what dropping one silently would
   * do: an option whose only reference is dangling looks EMPTY, and empty fails
   * closed, so a deleted document elsewhere would quietly remove this option from
   * every product. A caller that can report (admin, the Studio warning) should.
   */
  dangling: string[];
  /** Options that reference themselves. Harmless, dropped, worth reporting. */
  selfReferences: string[];
}

/**
 * Read `compatibleCustomizations` both ways.
 *
 * "Recording it on either option is enough" is the field's own description, so
 * the stored list is half the truth: A naming B means B is compatible with A,
 * whether or not B's list says so. Every read has to take the union, and doing it
 * once here is what stops each caller from remembering.
 */
export function buildCompatibilityIndex(options: CustomizationOptionDoc[]): CompatibilityIndex {
  const known = new Set(options.map((o) => o._id));
  const pairs = new Map<string, Set<string>>();
  const dangling: string[] = [];
  const selfReferences: string[] = [];

  const link = (a: string, b: string) => {
    const set = pairs.get(a) ?? new Set<string>();
    set.add(b);
    pairs.set(a, set);
  };

  for (const option of options) {
    for (const ref of option.compatibleCustomizations ?? []) {
      if (ref === option._id) {
        selfReferences.push(option._id);
        continue;
      }
      if (!known.has(ref)) {
        dangling.push(`${option._id} → ${ref}`);
        continue;
      }
      link(option._id, ref);
      link(ref, option._id);
    }
  }

  return { pairs, dangling, selfReferences };
}

export interface EligibilityResult {
  /** Option ids that can appear on some product. */
  eligible: Set<string>;
  /**
   * Options excluded because their type is decided by another customization and
   * they are compatible with nothing. Not an error here — it is the rule — but it
   * is the single most likely cause of "why is this option missing", so it is
   * returned rather than inferred.
   */
  compatibleWithNothing: string[];
  /** Options whose `typeId` names no type in the catalog. Excluded. */
  unknownType: string[];
}

/**
 * Which options can appear at all, before any product or selection is considered.
 *
 * The two halves of `availabilityDecidedBy` are gated by different fields, and
 * this is the distinction the whole model turns on:
 *
 *   product        the product's own list decides. Compatibility is NOT consulted
 *                  — a material with an empty compatible list is still a material
 *                  the product can offer.
 *   customization  the material or process it goes on decides, and that is
 *                  expressed only through `compatibleCustomizations`. So EMPTY
 *                  MEANS NOTHING IS COMPATIBLE and the option can never appear
 *                  (PROD-2534, which accepted this cost explicitly: "An option
 *                  with nothing recorded combines with nothing").
 *
 * Failing closed here is deliberate. The alternative — treating empty as "no
 * restriction" — is what the registry does, and it would make an option nobody
 * has paired yet available everywhere, which is the wrong way to be wrong.
 */
export function eligibleOptions(catalog: Catalog, index?: CompatibilityIndex): EligibilityResult {
  const compatibility = index ?? buildCompatibilityIndex(catalog.options);
  const typeById = new Map(catalog.types.map((t) => [t._id, t]));

  const eligible = new Set<string>();
  const compatibleWithNothing: string[] = [];
  const unknownType: string[] = [];

  for (const option of catalog.options) {
    const type = typeById.get(option.typeId);
    if (!type) {
      unknownType.push(option._id);
      continue;
    }
    if (type.availabilityDecidedBy === 'product') {
      eligible.add(option._id);
      continue;
    }
    if ((compatibility.pairs.get(option._id)?.size ?? 0) > 0) {
      eligible.add(option._id);
    } else {
      compatibleWithNothing.push(option._id);
    }
  }

  return { eligible, compatibleWithNothing, unknownType };
}

export interface ProductOffer {
  type: CustomizationTypeDoc;
  /** Option ids this product offers of that type, in catalog order. */
  optionIds: string[];
}

export interface ProductOfferResult {
  offers: ProductOffer[];
  /**
   * Listed options whose type says another customization decides — the product
   * has no business listing them. The Studio picker cannot produce these, but a
   * script or a push from the product data source does not go through the picker
   * (the schema makes the same point about preset validation), so they are
   * ignored and named rather than trusted.
   */
  notTheProductsToChoose: string[];
  /** Listed options that name no option in the catalog. Ignored. */
  unknownOptions: string[];
}

/**
 * What one product offers, for the types the product decides (PROD-2529).
 *
 * `availableCustomizations` lists OPTIONS, not types: there is no "and all of
 * this type" shorthand in Sanity the way the registry has a scope row with no
 * values, so a type is offered exactly when the product lists at least one of its
 * options.
 */
export function offersForProduct(catalog: Catalog, product: ProductDoc): ProductOfferResult {
  const typeById = new Map(catalog.types.map((t) => [t._id, t]));
  const optionById = new Map(catalog.options.map((o) => [o._id, o]));
  const order = new Map(catalog.options.map((o, i) => [o._id, i]));

  const byType = new Map<string, string[]>();
  const notTheProductsToChoose: string[] = [];
  const unknownOptions: string[] = [];

  for (const entry of product.availableCustomizations ?? []) {
    const option = optionById.get(entry.optionId);
    if (!option) {
      unknownOptions.push(entry.optionId);
      continue;
    }
    const type = typeById.get(option.typeId);
    if (!type) {
      unknownOptions.push(entry.optionId);
      continue;
    }
    if (type.availabilityDecidedBy !== 'product') {
      notTheProductsToChoose.push(entry.optionId);
      continue;
    }
    const list = byType.get(type._id) ?? [];
    if (!list.includes(option._id)) list.push(option._id);
    byType.set(type._id, list);
  }

  const offers: ProductOffer[] = [];
  for (const type of catalog.types) {
    const optionIds = byType.get(type._id);
    if (!optionIds || optionIds.length === 0) continue;
    optionIds.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    offers.push({ type, optionIds });
  }

  return { offers, notTheProductsToChoose, unknownOptions };
}
