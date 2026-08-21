/**
 * The fixed label list for Property Value `facts` (Decisions D41).
 *
 * A fact's label is NOT free text — free labels drift to "Caliper" · "caliper" ·
 * "Thickness (in)" across documents and then nothing lines up in a comparison.
 * The label is picked from this list, and each entry carries a `title` and (for
 * numbers) a `unit`, feeding three surfaces from one source:
 *
 *   Studio dropdown   Caliper (in)     title + unit
 *   Column header     CALIPER          title
 *   Cell              0.012"           value + symbol (falls back to unit)
 *
 * Column order on the page comes from THIS list, never the array order (editors
 * drag rows; two values won't agree). The front end walks the list and looks
 * each label up. `unit` is empty for a unitless fact (Max colours → bare number).
 *
 * ✅ Confirmed against the Metallic Paperboard configurator prototype (2026-08-21):
 * the columns it renders are Caliper · Basis weight · Commonly used for. Two of
 * those three are below. The third is deliberately absent — see BASIS WEIGHT.
 *
 * Escape hatch (D41): if this grows past ~30 entries or production wants units
 * editable without a deploy, `label` becomes a reference to a small document type
 * carrying `title` + `unit`. At 5 entries that trigger is a long way off.
 *
 * Numbers and text use separate lists so a numeric label can't land on a text
 * fact (and vice versa); units only exist on numbers.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 BASIS WEIGHT IS MISSING ON PURPOSE. DO NOT ADD IT HERE.
 *
 * The prototype renders it as a column, so it IS wanted on the page — but it
 * cannot live on a Property Value. `facts` sits on a document shared by every
 * Option that offers it, so it has exactly one slot per label, and basis weight
 * is not one number:
 *
 *   12pt metallic paperboard  ≈ 250gsm     (metallized film + clay coat, denser)
 *   12pt kraft / CCNB         ≈ 220gsm
 *   18pt SBS ≈ 450 GSM vs 18pt kraft ≈ 300 GSM   (Decisions D41, verified)
 *
 * Caliper passes the test — 12pt IS 0.012" on every board, by definition. Basis
 * weight fails it. Add `basisWeight` to this list and the first editor to type
 * 250 on the shared `12pt` document publishes it to the SBS and kraft pages too,
 * with nothing to validate it and no error anywhere.
 *
 * Per-Option numbers need the overlay field on Customization Option that D41
 * named but deliberately did not build ("the Option gains no field today").
 * Property Value.md: "it goes on the Customization Option as the same row shape
 * with a reference to the value it annotates".
 *
 * UNBLOCK: confirm with Eric whether 12pt shows 250gsm on the SBS page too.
 *   • same number everywhere → it passes the test; add it here.
 *   • different per material → build the Option overlay; it never belongs here.
 * Until then the column simply does not render, which stores nothing wrong.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type FactLabel = {
  value: string
  title: string
  /** Canonical unit token — feeds the Studio dropdown, e.g. `Caliper (in)`. */
  unit?: string
  /**
   * Cell glyph, when it differs from `unit`. The prototype's cell reads `0.012"`
   * while its dropdown reads `Caliper (in)` — `in` and `"` are the same unit in
   * two notations, and one cannot be derived from the other without a lookup.
   * Omit when the token IS the glyph (`gsm` → `250gsm`).
   */
  symbol?: string
}

/** Numeric facts — `factNumber`. Units are rendered from this list, never typed. */
export const NUMBER_FACT_LABELS: readonly FactLabel[] = [
  // ✅ In the prototype. 12pt → 0.012" — the number IS the value (D41's test).
  { value: 'caliper', title: 'Caliper', unit: 'in', symbol: '"' },
  // From D41's own worked examples: geometry / process ceilings, which are
  // intrinsic to the value and so identical across every Option that offers it.
  { value: 'fluteHeight', title: 'Flute height', unit: 'mm' },
  { value: 'filmThickness', title: 'Film thickness', unit: 'µm' },
  { value: 'maxColours', title: 'Max colours' }, // unitless — bare number
  // 🔴 basisWeight intentionally absent — see the header block above.
] as const

/** Text facts — `factText`. No unit. */
export const TEXT_FACT_LABELS: readonly FactLabel[] = [
  // ✅ In the prototype: "Commonly used for: light folding cartons".
  { value: 'commonlyUsedFor', title: 'Commonly used for' },
] as const

/** Studio dropdown options: `Caliper (in)`, `Max colours`, `Commonly used for`. */
export function factLabelOptions(labels: readonly FactLabel[]) {
  return labels.map((l) => ({
    title: l.unit ? `${l.title} (${l.unit})` : l.title,
    value: l.value,
  }))
}

/**
 * Cell rendering: `0.012"` · `250gsm` · `4`. Number and unit HUG — every case in
 * the prototype does, which is why D41 dropped the `tight` flag it had drafted.
 */
export function formatFactValue(value: number, label?: FactLabel) {
  return `${value}${label?.symbol ?? label?.unit ?? ''}`
}
