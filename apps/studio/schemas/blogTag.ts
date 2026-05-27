import { defineField, defineType } from 'sanity'

/**
 * blogTag — flat tag document type
 * URL pattern: /blog/tag/{slug}
 *
 * Tags stay FLAT. Grouping (for Studio organization and on-page tag facets) is a
 * pure classification via `tagGroup` — a closed enum of axes. No nested document
 * types, no grouping encoded in slugs or titles. The tag URL is unaffected.
 *
 * TAG_GROUPS is the single source of truth for the axis vocabulary. 7 of the 11
 * reference axes are defined so far (the canonical Tagging Reference doc is not
 * yet in-repo); add the remaining 4 here when finalized. Keep values kebab-case.
 * The Studio structure (apps/studio/structure) and seed (apps/studio/scripts/seed.mjs)
 * mirror these values — update them together.
 */

export const TAG_GROUPS = [
  { value: 'material', title: 'Material' },
  { value: 'packaging-type', title: 'Packaging Type' },
  { value: 'finish', title: 'Finish' },
  { value: 'industry', title: 'Industry' },
  // { value: 'channel', title: 'Channel' },
  // { value: 'design-style', title: 'Design Style' },
  // { value: 'topic', title: 'Topic' },
] as const

/**
 * Explicit sentinel for tags deliberately left unclassified. Stored as a real
 * value (not undefined) so the radio always shows a clear selection and editors
 * can ungroup with one click instead of hunting for a "clear field" action.
 * Not part of TAG_GROUPS — it is not an axis and gets no Studio sub-list.
 */
export const TAG_GROUP_UNGROUPED = 'ungrouped'

export const blogTag = defineType({
  name: 'blogTag',
  title: 'Blog Tag',
  type: 'document',
  groups: [
    { name: 'overview', title: 'Overview', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ── Overview ────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'overview',
      options: { source: 'title' },
      description: 'Used in the URL: /blog/tag/{slug}. Set once — changing breaks links.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tagGroup',
      title: 'Group / axis',
      type: 'string',
      group: 'overview',
      description:
        'Classification axis used to group this flat tag in Studio and in on-page tag facets. Choose "Ungrouped" to leave it unclassified. Does not change the tag URL.',
      initialValue: TAG_GROUP_UNGROUPED,
      options: {
        list: [
          { value: TAG_GROUP_UNGROUPED, title: 'Ungrouped' },
          ...TAG_GROUPS.map(({ value, title }) => ({ value, title })),
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'overview',
      description: 'Order within the group. Lower = first.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      group: 'overview',
      description: 'Short description shown on the /blog/tag/{slug} landing page.',
    }),

    // ── SEO ──────────────────────────────────────────────────────────────────
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      group: 'seo',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      validation: (Rule) => Rule.max(160),
    }),
    defineField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'seo',
      options: { hotspot: true },
      description: 'Social share image. Falls back to site default if not set.',
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug', tagGroup: 'tagGroup' },
    prepare({ title, slug, tagGroup }) {
      const groupTitle =
        tagGroup === TAG_GROUP_UNGROUPED
          ? 'Ungrouped'
          : TAG_GROUPS.find((g) => g.value === tagGroup)?.title
      const url = slug?.current ? `/blog/tag/${slug.current}` : 'No slug'
      return { title, subtitle: groupTitle ? `${groupTitle} · ${url}` : url }
    },
  },
  orderings: [
    {
      title: 'Title A–Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
    {
      title: 'Group → order',
      name: 'groupOrder',
      by: [
        { field: 'tagGroup', direction: 'asc' },
        { field: 'order', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
  ],
})
