import { defineArrayMember, defineField } from 'sanity'
import { GROUPS, type GroupName } from './field-groups'

/**
 * The sections framework — Conventions §2.4, Foundations (PROD-2286).
 *
 * A page is assembled from an ordered `sections` array. This file provides the
 * one array-plus-insert-menu pattern every page-shaped type reuses, so a Product
 * page and a Listing page compose from the same mechanism with the same grouped,
 * icon'd, grid+list insert menu the blog editors already know.
 *
 * Harvested from the blog's page-builder config (`schemas/blocks/index.ts`) with
 * one deliberate subtraction: **no presentation fields travel with it.** Border
 * booleans, colour pickers and image effects are design's job, not content's
 * (Eric, 2026-08-14) — a section is named for what it shows, and how it's drawn
 * is not an editor decision. Sections built for these arrays declare their own
 * content fields and stop there.
 *
 * §2.4 also fixes the shape: **one `sections` field per type**, never two on one
 * form — that was the `pageBuilderLanding` mistake. Scope which sections a page
 * family may insert with the `allow` list, not with a second field.
 */

/** A labelled group in the insert menu — e.g. `{ name: 'cta', title: 'CTA', of: [...] }`. */
export type SectionInsertGroup = {
  name: string
  title: string
  /** Section type names shown under this group. */
  of: string[]
}

type SectionInsertMenuOptions = {
  /**
   * Optional resolver mapping a section `_type` to a preview thumbnail URL for
   * the grid view. This is insert-menu chrome, not a content field — supply it
   * for a richer picker, omit it for a plain grid. Never a per-document setting.
   */
  previewImageUrl?: (schemaTypeName: string) => string | undefined
}

/**
 * Insert-menu configuration for a sections array: grouped, icon'd, with both
 * grid and list views. Mirrors the blog's menu so the two feel identical.
 */
export function sectionInsertMenu(
  groups: SectionInsertGroup[],
  { previewImageUrl }: SectionInsertMenuOptions = {},
) {
  return {
    filter: 'auto' as const,
    showIcons: true,
    groups,
    views: [
      previewImageUrl
        ? { name: 'grid' as const, previewImageUrl }
        : { name: 'grid' as const },
      { name: 'list' as const },
    ],
  }
}

type SectionsFieldOptions = {
  /** Section type names this page family may insert. Scopes the array — §2.4. */
  allow: string[]
  /** Insert-menu groups. Every name in a group's `of` should appear in `allow`. */
  insertGroups: SectionInsertGroup[]
  /** Field group/tab id — defaults to the Sections tab. */
  group?: GroupName
  /** Override the field name; defaults to `sections`. */
  name?: string
  /** Override the field title; defaults to `Sections`. */
  title?: string
  /** Override the field description. */
  description?: string
  /** Optional grid-view thumbnail resolver — see `sectionInsertMenu`. */
  previewImageUrl?: (schemaTypeName: string) => string | undefined
}

/**
 * The single `sections` field a page-shaped type carries. Import it, scope it
 * with `allow`, and drop it on the type — never declare two of these on one
 * form.
 *
 * @example
 *   sectionsField({
 *     allow: ['heroSection', 'featureRow', 'ctaBand'],
 *     insertGroups: [
 *       { name: 'lead', title: 'Lead', of: ['heroSection'] },
 *       { name: 'body', title: 'Body', of: ['featureRow'] },
 *       { name: 'cta', title: 'CTA', of: ['ctaBand'] },
 *     ],
 *   })
 */
export function sectionsField({
  allow,
  insertGroups,
  group = GROUPS.sections,
  name = 'sections',
  title = 'Sections',
  description = 'How this page is assembled, top to bottom. Add, reorder and remove sections; each is a self-contained block of content.',
  previewImageUrl,
}: SectionsFieldOptions) {
  return defineField({
    name,
    title,
    type: 'array',
    group,
    description,
    of: allow.map((type) => defineArrayMember({ type })),
    options: { insertMenu: sectionInsertMenu(insertGroups, { previewImageUrl }) },
  })
}
