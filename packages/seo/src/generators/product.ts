import type { ProductInput } from "../types";

/** Trimmed, non-empty entries only — an empty list must omit the property. */
function cleanList(values: readonly string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

/**
 * Product — the "this is a product" node.
 *
 * 🔴 Deliberately emits **no `offers`, `review` or `aggregateRating`**, so these
 * pages are NOT eligible for Google's Product rich result. PakFactory quotes
 * custom manufacturing against an MOQ; there is no list price, and inventing one
 * to unlock the rich result would be a false public claim. Decided in
 * `Sanity/SEO Model.md` §6 and Decisions D82 — do not "fix" this by adding an
 * offer.
 *
 * ⚠️ `ProductTestimonial.rating` in the catalog types is a **company-level
 * Google review**, not a review of this product. Mapping it to
 * `aggregateRating` would be a schema.org violation and a manual-action risk.
 *
 * Manufacturing facts with no schema.org property of their own — MOQ, lead time,
 * dimension range — go in `additionalProperty` as PropertyValue pairs.
 */
export function product(input: ProductInput): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    "@type": "Product",
    name: input.name,
    url: input.url,
  };
  if (input.id) doc["@id"] = input.id;
  if (input.description) doc.description = input.description;
  if (input.sku) doc.sku = input.sku;
  if (input.brand) doc.brand = input.brand;

  if (typeof input.image === "string") {
    if (input.image) doc.image = input.image;
  } else {
    const images = cleanList(input.image);
    if (images.length) doc.image = images;
  }

  const aliases = cleanList(input.alternateName);
  if (aliases.length) doc.alternateName = aliases;

  const properties = (input.additionalProperty ?? []).filter(
    (property) => property.name.trim() && property.value.trim(),
  );
  if (properties.length) {
    doc.additionalProperty = properties.map((property) => ({
      "@type": "PropertyValue",
      name: property.name,
      value: property.value,
    }));
  }

  return doc;
}
