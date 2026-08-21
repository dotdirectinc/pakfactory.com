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
 *   Cell              0.012"           value + unit
 *
 * Column order on the page comes from THIS list, never the array order (editors
 * drag rows; two values won't agree). The front end walks the list and looks
 * each label up. `unit` is empty for a unitless fact (Max colours → bare number).
 *
 * ⚠️ 🟡 STARTER LIST — confirm the real labels/units with Eric before this ships.
 * These are drawn from the entity-spec examples, not a production inventory.
 *
 * Escape hatch (D41): if this grows past ~30 entries or production wants units
 * editable without a deploy, `label` becomes a reference to a small document type
 * carrying `title` + `unit`. Mechanical change; the row shape is unaffected.
 *
 * Numbers and text use separate lists so a numeric label can't land on a text
 * fact (and vice versa); units only exist on numbers.
 */

export type FactLabel = { value: string; title: string; unit?: string }

/** Numeric facts — `factNumber`. `unit` is rendered by the front end, never typed. */
export const NUMBER_FACT_LABELS: readonly FactLabel[] = [
  { value: 'caliper', title: 'Caliper', unit: 'in' },
  { value: 'fluteHeight', title: 'Flute height', unit: 'mm' },
  { value: 'filmThickness', title: 'Film thickness', unit: 'µm' },
  { value: 'maxColours', title: 'Max colours' }, // unitless — bare number
] as const

/** Text facts — `factText`. No unit. */
export const TEXT_FACT_LABELS: readonly FactLabel[] = [
  { value: 'commonlyUsedFor', title: 'Commonly used for' },
] as const

/** Studio dropdown options: `Caliper (in)`, `Max colours`, `Commonly used for`. */
export function factLabelOptions(labels: readonly FactLabel[]) {
  return labels.map((l) => ({
    title: l.unit ? `${l.title} (${l.unit})` : l.title,
    value: l.value,
  }))
}
