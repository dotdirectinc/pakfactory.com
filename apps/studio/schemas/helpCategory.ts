import { defineField, defineType } from 'sanity'
import { FolderIcon } from '@sanity/icons'
import { groupsFor, GROUPS } from '../lib/field-groups'
import { seoFields, socialFields } from '../lib/seo-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'
import { uniqueSlugAcross } from '../lib/slug-rules'

/**
 * Help Category — a Help Center section (Entities/Help Category.md). A real page,
 * because the nav links straight into two of them. It exists because of the nav:
 * "Shipping Info" and "MOQ list" under Support aren't separate pages, they're
 * Help Center sections, so a category needs a slug and a URL of its own.
 *
 * 🔴 The browse listing is DERIVED, not maintained — every `general` FAQ whose
 * `category` points here appears on this page. There is deliberately no
 * `questions` array: it once set the order AND decided what appeared, and the
 * failure was silent — forget an entry and a published answer is invisible with
 * no error anywhere (D31). What replaces it: `featured` pins a few, the rest
 * order alphabetically (a front-end rule), and `scope` on the FAQ gates what
 * shows — contextual answers never appear here.
 */
export const helpCategory = defineType({
  name: 'helpCategory',
  title: 'Help Category',
  type: 'document',
  icon: FolderIcon,
  groups: groupsFor(['content', 'categorization', 'seo', 'social']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description:
        'The section name — e.g. Pricing, MOQ & Lead Times · Ordering & Quotes · Artwork & Files · Shipping & Delivery.',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: GROUPS.content,
      description: 'The /help/<slug> segment — linkable from the nav.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required().custom(uniqueSlugAcross(['helpCategory'])),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description: 'Short intro shown at the top of the category page.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured FAQs',
      type: 'array',
      group: GROUPS.categorization,
      description:
        'Optional — pin a few answers to the top of the category page, in this order. Empty means nothing pinned and the derived list stands on its own. The full listing is derived from every general FAQ pointing here; you never maintain it by hand.',
      of: [{ type: 'reference', to: [{ type: 'faq' }] }],
      validation: (Rule) => Rule.unique(),
    }),
    ...seoFields({ group: GROUPS.seo, indexDefault: true }),
    ...socialFields({ group: GROUPS.social, channel: MEDIA_TAG.website }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
    prepare({ title, subtitle }) {
      return { title: title || 'Untitled category', subtitle: subtitle ? `/help/${subtitle}` : '' }
    },
  },
})
