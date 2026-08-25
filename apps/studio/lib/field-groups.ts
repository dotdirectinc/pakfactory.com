/**
 * The one tab set every content type shares — Conventions §2.4.
 *
 * The Studio already ships this vocabulary on Post, Case Study and Blog Page;
 * this file makes it a single importable definition so no type re-invents a tab
 * name, re-orders the set, or quietly adds a ninth. An area task calls
 * `groupsFor([...])` with the tabs its type actually needs and gets them back in
 * the canonical order, with Content pre-selected.
 *
 * Three rules from §2.4 are enforced here, not left to reviewer memory:
 *
 * 1. **Closed vocabulary.** `GroupName` is a union of exactly eight ids. A typo
 *    or an invented ninth tab is a TypeScript error, not a runtime surprise.
 * 2. **Fixed order.** The order a type declares its groups in is ignored;
 *    `groupsFor` always returns them in `GROUP_ORDER`. "The order never varies."
 * 3. **Content is the default.** Whenever a type includes Content it opens there.
 *    A type without Content (a settings singleton, say) opens on its first tab.
 *
 * Adopting these renames nothing — the ids match the groups already deployed on
 * `post` / `caseStudy` / `blogPage` — so there is no content migration.
 */

/** The eight tab ids, in the order an editor sees them. Closed set — §2.4. */
export const GROUP_ORDER = [
  'content',
  'categorization',
  'publishing',
  'sections',
  'specs',
  'schemaAi',
  'seo',
  'social',
] as const

export type GroupName = (typeof GROUP_ORDER)[number]

/** Human titles for each tab. `schemaAi` keeps the word "Schema" deliberately — §2.4. */
const GROUP_TITLES: Record<GroupName, string> = {
  content: 'Content',
  categorization: 'Categorization',
  publishing: 'Publishing',
  sections: 'Sections',
  specs: 'Specs',
  schemaAi: 'Schema & AI',
  seo: 'SEO',
  social: 'Social',
}

/**
 * Field groups (tabs) for a type, in canonical order, with Content defaulted.
 *
 * Pass the tabs the type needs, in any order — the result is always ordered by
 * `GROUP_ORDER`. Duplicates are collapsed. Content becomes the default tab; if
 * the type has no Content tab, the first tab in canonical order defaults instead
 * so the form never opens with nothing selected.
 *
 * @example
 *   // Post: Content · Categorization · Publishing · Schema & AI · SEO · Social
 *   groups: groupsFor(['content', 'categorization', 'publishing', 'schemaAi', 'seo', 'social'])
 *
 *   // Property Value: a single Content tab
 *   groups: groupsFor(['content'])
 */
export function groupsFor(
  names: GroupName[],
): Array<{ name: GroupName; title: string; default?: boolean }> {
  const wanted = new Set(names)
  const ordered = GROUP_ORDER.filter((name) => wanted.has(name))
  const defaultName: GroupName | undefined = ordered.includes('content')
    ? 'content'
    : ordered[0]

  return ordered.map((name) => ({
    name,
    title: GROUP_TITLES[name],
    ...(name === defaultName ? { default: true } : {}),
  }))
}

/**
 * The group id to tag a field with, spelled the same everywhere — §2.4's
 * "same field, same tab, everywhere". Import this rather than typing the string,
 * so `group: GROUPS.categorization` can never drift to `'categorisation'`.
 */
export const GROUPS: Record<GroupName, GroupName> = Object.fromEntries(
  GROUP_ORDER.map((name) => [name, name]),
) as Record<GroupName, GroupName>
