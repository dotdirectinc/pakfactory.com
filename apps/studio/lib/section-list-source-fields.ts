import {defineField} from 'sanity'
import {SectionListSourceInput} from '../components/SectionListSourceInput'
import {SECTION_GROUPS} from './section-field-groups'

export type SectionListSourceMode = 'page' | 'derive'

export type SectionListSourceFieldOptions = {
  /**
   * `page` — inherit host document list (ADR-020 §8).
   * `derive` — fill from row `source` + `count`.
   */
  mode: SectionListSourceMode
  /** Chip / menu label shown to editors. */
  chipLabel: string
  /** Field group. Defaults to Content. */
  group?: string
  /** Initial value. Defaults to `mode` (`page` or `derive`). */
  initialValue?: SectionListSourceMode | 'custom'
  /** Override field title. Defaults to "List source". */
  title?: string
}

/**
 * Explicit list source for section bands — chip vs custom (ADR-020 §8).
 * Store `page` | `derive` | `custom`. Pair with {@link hideUnlessCustomList}.
 */
export function sectionListSourceField({
  mode,
  chipLabel,
  group = SECTION_GROUPS.content,
  initialValue,
  title = 'List source',
}: SectionListSourceFieldOptions) {
  return defineField({
    name: mode === 'derive' ? 'curatedSource' : 'listSource',
    title,
    type: 'string',
    group,
    initialValue: initialValue ?? mode,
    description: 'Page field chip, or a custom list below.',
    options: {
      hostValue: mode,
      chipLabel,
    },
    components: {input: SectionListSourceInput},
  })
}

type ParentWithSources = {
  listSource?: string
  curatedSource?: string
}

/** Hide curated/override arrays unless the editor chose Custom list. */
export function hideUnlessCustomList({
  parent,
}: {
  parent?: ParentWithSources
}): boolean {
  const source = parent?.listSource ?? parent?.curatedSource
  return source !== 'custom'
}

/** Hide derive controls (source / count) when using a custom curated list. */
export function hideWhenCustomList({
  parent,
}: {
  parent?: ParentWithSources
}): boolean {
  return parent?.curatedSource === 'custom'
}
