/**
 * Inspiration pre-selections that their base product does not offer (PROD-3035).
 *
 * A pre-selection is content, Studio-owned (ADR-025 amendment 2026-10-14): what the site's configurator
 * starts from. A preset offers what its base offers, so a pre-selection the base no longer offers leaves
 * the configurator starting from something that cannot be chosen. Studio warns on both documents — the
 * preset, and the base whose offer broke it — and never blocks: the two can be edited in either order.
 */

const clean = (id: string) => id.replace(/^drafts\./, '')

/** The pre-selected option ids the offer leaves out, each once, in the order they were listed. */
export function strayPreselections(offered: Set<string>, preselected: (string | null | undefined)[]): string[] {
  const out: string[] = []
  for (const raw of preselected) {
    if (!raw) continue
    const id = clean(raw)
    if (!offered.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}

const listOf = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`

/** On the preset: which of its pre-selections its base does not offer. */
export function presetWarning(optionNames: string[], baseTitle: string): string {
  const one = optionNames.length === 1
  return `Pre-selects ${listOf(optionNames)}, which ${baseTitle} doesn't offer — the configurator can't start from ${one ? 'it' : 'them'}. Offer ${one ? 'it' : 'them'} on ${baseTitle}, or change the pre-selection${one ? '' : 's'} here.`
}

/** On the base: the presets built from it whose pre-selections it does not offer. */
export function baseWarning(rows: { title: string; options: string[] }[], shown = 8): string {
  const n = rows.length
  const listed = rows.slice(0, shown).map((r) => `${r.title} (${r.options.join(', ')})`).join('; ')
  const more = n > shown ? `; and ${n - shown} more` : ''
  return `${n} inspiration ${n === 1 ? 'product pre-selects' : 'products pre-select'} options this product doesn't offer: ${listed}${more}. Offer them here, or change ${n === 1 ? 'its' : 'their'} pre-selections.`
}
