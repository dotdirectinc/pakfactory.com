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
 * each label up. `unit` is empty for a unitless fact (Max colors → bare number).
 *
 * ✅ Confirmed against the Metallic Paperboard configurator prototype (2026-08-21):
 * the columns it renders are Caliper · Basis weight · Commonly used for. All
 * three are below.
 *
 * Escape hatch (D41): if this grows past ~30 entries or production wants units
 * editable without a deploy, `label` becomes a reference to a small document type
 * carrying `title` + `unit`. At 6 entries that trigger is a long way off.
 *
 * Numbers and text use separate lists so a numeric label can't land on a text
 * fact (and vice versa); units only exist on numbers.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY BASIS WEIGHT IS ALLOWED HERE (decided by Eric + Richard, 2026-08-21)
 *
 * D41 ruled that per-pairing numbers must NOT sit on a Property Value, because
 * one document is shared by every Option that offers it and basis weight is not
 * one number (18pt SBS ≈ 450 GSM against 18pt kraft ≈ 300 GSM). That reasoning
 * assumed ONE `14pt` document serving every material.
 *
 * The 2026-08-21 decision changes that premise: a thickness value is scoped to
 * its (Property × Customization Type) pairing and carries a DISTINCT TITLE —
 * `12pt - Corrugated`, `12pt - Blister Plastic` — so each pairing has its own
 * document and its own slot per label. One slot is now enough.
 *
 * This is NOT the variant D41 rejected. That one was two documents both titled
 * `14pt`, and D41's own closing test was: "the tell that it is duplication
 * rather than distinction is that both documents have the same title. If two
 * values genuinely differ, they should not share a name." Distinct titles are
 * exactly what that test asks for — and `uniqueTaxonomyTitle` on `title`
 * already enforces it, so the rejected shape cannot be saved.
 *
 * ⚠️ The cost D41 named is real and now accepted: caliper is identical across
 * every material at a given point size (12pt IS 0.012" by definition), so it
 * gets retyped once per pairing and can drift once per pairing. Nothing
 * validates that today. If drift shows up, the fix is a Studio action that
 * copies a sibling's rows at creation — not a shared document, which is the
 * thing this decision deliberately moved away from.
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
  // ✅ In the prototype. Per-pairing, which is why the value must be per-pairing
  // too — see the header block. Cell reads `250gsm`, hugging.
  { value: 'basisWeight', title: 'Basis weight', unit: 'gsm' },
  // From D41's own worked examples: geometry / process ceilings, which are
  // intrinsic to the value and so identical across every Option that offers it.
  { value: 'fluteHeight', title: 'Flute height', unit: 'mm' },
  { value: 'filmThickness', title: 'Film thickness', unit: 'µm' },
  { value: 'maxColors', title: 'Max colors' }, // unitless — bare number
] as const

/** Text facts — `factText`. No unit. */
export const TEXT_FACT_LABELS: readonly FactLabel[] = [
  // ✅ In the prototype: "Commonly used for: light folding cartons".
  { value: 'commonlyUsedFor', title: 'Commonly used for' },
] as const

/** Studio dropdown options: `Caliper (in)`, `Max colors`, `Commonly used for`. */
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
