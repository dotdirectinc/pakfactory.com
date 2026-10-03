/**
 * GROQ fragments for Sanity `product.kind` (`standard` | `inspiration`).
 *
 * Surface rule: product-line paths use {@link KIND_STANDARD}; solution paths use
 * {@link KIND_INSPIRATION}. Do not inline these compares in queries.
 */

/**
 * Product line / style catalog surfaces.
 * Unset `kind` counts as standard (matches www `mapSanityProduct`).
 */
export const KIND_STANDARD = /* groq */ `(!defined(kind) || kind == "standard")`;

/** Solution LP / style collection / hero product surfaces. */
export const KIND_INSPIRATION = /* groq */ `kind == "inspiration"`;
