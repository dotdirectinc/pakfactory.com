/**
 * Moved here from `apps/studio/lib/` on 2026-08-31 (D48, Eric's schema review).
 *
 * The review asked whether the front end can import this map or would have to
 * duplicate it — and while it sat in the Studio app it could not, without reaching
 * into another app's internals. Duplicating it is the one outcome the list exists to
 * prevent: two copies of key→unit drift, and then a column header and its cells
 * disagree. `packages/sanity` is the package the Studio and both front ends already
 * depend on, so one definition now serves all three.
 *
 * The fixed label list for Property Value `facts` (Decisions D41).
 *
 * A fact's label is NOT free text — free labels drift to "Caliper" · "caliper" ·
 * "Thickness (in)" across documents and then nothing lines up in a comparison.
 * The label is picked from this list, and each entry carries a `title` and (for
 * numbers) a `unit`, feeding three surfaces from one source:
 *
 *   Studio dropdown   Caliper (pt)     title + unit
 *   Column header     CALIPER          title
 *   Cell              12pt             value + symbol (falls back to unit)
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
 * carrying `title` + `unit`. At 8 entries that trigger is a long way off.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTENT TEAM LABELS (Richard, 2026-09-15, PROD-2505)
 *
 * The content team's Material Properties workbook states the facts beside each
 * selectable value. Where it overlaps this list it wins; labels it does not cover
 * stay; labels only it has are added. The spec registry seeds the same codes.
 *
 *   caliper        unit in → pt: the workbook gives caliper as the point size
 *                  (4pt … 28pt); thickness is its own label now
 *   thickness      NEW, mm — paperboard caliper values and chipboard thickness
 *   basisWeight    title "Basis weight" → "Nominal weight" (workbook: Nominal Weight (GSM))
 *   fluteHeight    title "Flute height" → "Thickness", unit mm → in (B-Flute 1/8")
 *   flutesPerFoot  NEW text fact — "47 ft ± 3 ft" is a range, not one number
 *
 * The workbook's inch thickness and GSM on paperboard are marked "for internal ref,
 * not show", so they are not labels here (the registry keeps them internally).
 * Changing units was safe: no Property Value on production (0/32) or development
 * (0/34) carried any fact on 2026-09-15.
 * ─────────────────────────────────────────────────────────────────────────────
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
  // ✅ In the prototype. The point size — `12pt` → 12 (content team workbook, 2026-09-15).
  { value: 'caliper', title: 'Caliper', unit: 'pt' },
  // Content team workbook: the measured thickness beside a caliper or chipboard value.
  { value: 'thickness', title: 'Thickness', unit: 'mm' },
  // ✅ In the prototype. Per-pairing, which is why the value must be per-pairing
  // too — see the header block. Cell reads `250gsm`, hugging.
  { value: 'basisWeight', title: 'Nominal weight', unit: 'gsm' },
  // From D41's own worked examples: geometry / process ceilings, intrinsic to the value.
  // Content team workbook: a flute grade's thickness, in inches (B-Flute 1/8" → 0.125).
  { value: 'fluteHeight', title: 'Thickness', unit: 'in', symbol: '"' },
  { value: 'filmThickness', title: 'Film thickness', unit: 'µm' },
  { value: 'maxColors', title: 'Max colors' }, // unitless — bare number
] as const

/** Text facts — `factText`. No unit: the text carries its own ("47 ft ± 3 ft"). */
export const TEXT_FACT_LABELS: readonly FactLabel[] = [
  // ✅ In the prototype: "Commonly used for: light folding cartons".
  { value: 'commonlyUsedFor', title: 'Commonly used for' },
  // Content team workbook: flutes per linear foot is a tolerance range, so it is text.
  { value: 'flutesPerFoot', title: 'Flutes per linear foot' },
] as const

/** Studio dropdown options: `Caliper (pt)`, `Max colors`, `Commonly used for`. */
export function factLabelOptions(labels: readonly FactLabel[]) {
  return labels.map((l) => ({
    title: l.unit ? `${l.title} (${l.unit})` : l.title,
    value: l.value,
  }))
}

/**
 * Cell rendering: `12pt` · `0.125"` · `250gsm` · `4`. Number and unit HUG — every case in
 * the prototype does, which is why D41 dropped the `tight` flag it had drafted.
 */
export function formatFactValue(value: number, label?: FactLabel) {
  return `${value}${label?.symbol ?? label?.unit ?? ''}`
}
