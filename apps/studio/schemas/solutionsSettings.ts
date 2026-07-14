import { defineField, defineType } from 'sanity'
import { CogIcon } from '@sanity/icons'
import { MEDIA_TAG, ogMediaTags, taggedImageField } from '../lib/media-tags'

export const solutionsSettings = defineType({
  name: 'solutionsSettings',
  title: 'Solutions Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    // ─── FEATURED ─────────────────────────────────────────────────────────────

    defineField({
      name: 'featuredSolutions',
      title: 'Featured solutions',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'solution' }] }],
      description: 'Highlighted on the Solutions landing page. Max 6.',
      validation: (Rule) => Rule.max(6),
    }),

    // ─── DEFAULT CTA ──────────────────────────────────────────────────────────

    defineField({
      name: 'cta',
      title: 'Default CTA',
      type: 'object',
      description: 'Shown at the bottom of every solution page unless overridden.',
      fields: [
        defineField({
          name: 'headline',
          title: 'Headline',
          type: 'string',
          initialValue: 'Ready to solve your packaging challenge?',
        }),
        defineField({
          name: 'subtext',
          title: 'Subtext',
          type: 'text',
          rows: 2,
        }),
        defineField({
          name: 'buttonLabel',
          title: 'Button label',
          type: 'string',
          initialValue: 'Get a quote',
        }),
      ],
    }),

    // ─── SEO DEFAULTS ─────────────────────────────────────────────────────────

    defineField({
      name: 'seo',
      title: 'SEO defaults',
      type: 'object',
      description: 'Fallback SEO fields for solution pages that do not have their own.',
      fields: [
        defineField({
          name: 'metaTitle',
          title: 'Meta title',
          type: 'string',
          validation: (Rule) => Rule.max(60),
        }),
        defineField({
          name: 'metaDescription',
          title: 'Meta description',
          type: 'text',
          rows: 2,
          validation: (Rule) => Rule.max(160),
        }),
        defineField(taggedImageField({
          name: 'ogImage',
          title: 'Default OG image',
          type: 'image',
          mediaTags: ogMediaTags(MEDIA_TAG.solution),
          options: { hotspot: true },
        })),
      ],
    }),
  ],

  preview: {
    prepare() {
      return { title: 'Solutions Settings' }
    },
  },
})
