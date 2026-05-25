import { defineField, defineType } from 'sanity'

/**
 * blogTag — flat tag document type
 * URL pattern: /blog/tag/{slug}
 */

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
    select: { title: 'title', slug: 'slug' },
    prepare({ title, slug }) {
      return { title, subtitle: slug?.current ? `/blog/tag/${slug.current}` : 'No slug' }
    },
  },
  orderings: [
    {
      title: 'Title A–Z',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
})
