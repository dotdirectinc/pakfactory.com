/**
 * In-section field groups (ADR-020) — All · Heading · Content · Layout.
 *
 * Closed vocabulary for www section *objects* only. Separate from document
 * tabs (`field-groups.ts`) and insert-menu entity tabs.
 *
 * No group is marked `default` so Studio prepends **All** and opens there —
 * same contract as document `groupsFor()`.
 */

export const SECTION_FIELD_GROUP_ORDER = [
  'heading',
  'content',
  'layout',
] as const

export type SectionFieldGroupName = (typeof SECTION_FIELD_GROUP_ORDER)[number]

const SECTION_FIELD_GROUP_TITLES: Record<SectionFieldGroupName, string> = {
  heading: 'Heading',
  content: 'Content',
  layout: 'Layout',
}

/** Ids to tag fields with — import these rather than string literals. */
export const SECTION_GROUPS: Record<SectionFieldGroupName, SectionFieldGroupName> =
  Object.fromEntries(
    SECTION_FIELD_GROUP_ORDER.map((name) => [name, name]),
  ) as Record<SectionFieldGroupName, SectionFieldGroupName>

/**
 * Field groups for a section object type, in canonical order.
 * Never marks `default` — Studio prepends All and selects it first.
 */
export function sectionFieldGroups(): Array<{
  name: SectionFieldGroupName
  title: string
}> {
  return SECTION_FIELD_GROUP_ORDER.map((name) => ({
    name,
    title: SECTION_FIELD_GROUP_TITLES[name],
  }))
}
