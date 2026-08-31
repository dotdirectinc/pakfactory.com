/**
 * Request submission rules — the shared half of the PROD-2398 contract.
 *
 * ⚠️ VENDORED FILE. This is copied byte-for-byte to
 * `pakfactory.com/apps/www/src/lib/request/contract.rules.ts`, and a CI parity
 * check compares the two by SHA-256. Edit here, copy across, in the same PR.
 *
 * 🔴 ZERO DEPENDENCIES, DELIBERATELY. `apps/www` does not depend on `zod`, and
 * pulling it into a client bundle so a button can decide whether to enable itself
 * is the wrong trade. The Zod schemas live in `./request.ts` (server-side only);
 * only these plain predicates cross the repo boundary. Do not add an import here.
 *
 * PROD-2398 asks the server to "mirror the client's validation". Mirroring means
 * two implementations that drift, so there is one — this file — called by the
 * client's submit gate and by the server's refinements alike.
 *
 * ── Assumptions, because they contradict PROD-2398's original acceptance criteria
 *
 *  1. MULTIPLES OF 100 IS A CLIENT AFFORDANCE, NOT A BUSINESS RULE.
 *     `QuantityPicker.jsx:23`: "Preset ladder tiers are exempt from the
 *     multiples-of-100 rule." The ladder is [moq, moq*2, moq*5, moq*10, moq*20],
 *     so at MOQ 250 it offers 250 and 1250 — and `onAdd` validates nothing; only
 *     the typed input is checked. Enforcing %100 server-side would reject a
 *     legitimate one-tap pick. We check `> 0` and `>= moq`.
 *
 *  2. A LINE NEEDS AT LEAST ONE QUANTITY. The POC allowed a ready line with none
 *     via `recommendVolume`; the shipped builder dropped the field. If it returns,
 *     it is additive: `quantityMode: 'stated' | 'recommend'`.
 *
 *  3. MOQ IS CALLER-SUPPLIED AND OPTIONAL. No authoritative source exists yet —
 *     `catalog.mock.ts` today, Sanity `product.moq`, and eventually
 *     `v_product_effective.effective_moq` (ADR-0008 D10). Validate when present;
 *     skip when absent. Do not invent a default.
 */

/** Year-scoped, matching the quote side's `Q-2026-0891`. Minted by the backend at
 *  enqueue from a sequence — never by the client (ADR-0012 D4). */
export const RFQ_REF_PATTERN = /^RFQ-\d{4}-\d{5}$/;

/** Client-side input step. Shared so the picker and the server agree on the number,
 *  even though only the client enforces it (assumption 1). */
export const QUANTITY_STEP = 100;

/** Minimal shape the rules need — structural, so both repos can pass their own types. */
export type QuantityLine = {
  contents: string;
  quantities: number[];
  moq?: number | null;
};

export type LocationLike = {
  country?: string;
} | null | undefined;

/** A location is usable when we know at least the country.
 *  Mirrors the client's `hasShippingLocation`. */
export function hasLocation(address: LocationLike): boolean {
  return Boolean(address?.country && address.country.trim().length > 0);
}

/** Assumption 1: positive, and at or above MOQ when MOQ is known. */
export function isQuantityValid(quantity: number, moq?: number | null): boolean {
  if (!Number.isFinite(quantity) || quantity <= 0) return false;
  if (typeof moq === 'number' && moq > 0 && quantity < moq) return false;
  return true;
}

/** Assumption 2: contents named, and at least one valid quantity. */
export function isLineReady(line: QuantityLine): boolean {
  if (line.contents.trim().length === 0) return false;
  if (line.quantities.length === 0) return false;
  return line.quantities.every((q) => isQuantityValid(q, line.moq));
}

/**
 * Every express quantity the buyer asked to be quoted, as one list.
 *
 * The builder's express step appends and removes freely
 * (`step-requirements.tsx`), so a buyer can ask for 2,500 AND 5,000 exactly as
 * they can on a product line. `expressQuantity` — singular — was written before
 * that was noticed, and reading only it drops every tier after the first: buyer
 * data lost in silence, on the one field the whole quote hangs on.
 *
 * Singular is still accepted and still first, so older clients keep working.
 */
export function expressQuantities(requirements: {
  expressQuantity?: number;
  expressQuantities?: number[];
}): number[] {
  const many = requirements.expressQuantities ?? [];
  const one = typeof requirements.expressQuantity === 'number' ? [requirements.expressQuantity] : [];
  // Dedupe: a client that sends both (the migration window) must not quote twice.
  //
  // 🔴 Returns what was SENT — it does not filter out invalid values. Dropping a
  // 0 here would hand `isExpressReady` a list of only the survivors, so a
  // submission carrying a bad tier would pass on the strength of its good ones.
  // Validation rejects; this function reports.
  return [...new Set([...one, ...many])];
}

/** Express lane: with no lines, the requirements block carries contents + quantities. */
export function isExpressReady(requirements: {
  packagingContents?: string;
  expressQuantity?: number;
  expressQuantities?: number[];
}): boolean {
  const contents = requirements.packagingContents ?? '';
  if (contents.trim().length === 0) return false;
  const quantities = expressQuantities(requirements);
  if (quantities.length === 0) return false;
  return quantities.every((q) => isQuantityValid(q));
}
