import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField, taggedImageType } from '../lib/media-tags'

export const capabilityType = defineType({
  name: 'capabilityType',
  title: 'Capability Type',
  type: 'document',
  groups: [
    { name: 'basic', title: 'Basic', default: true },
    { name: 'sharedSpecs', title: 'Shared Specs' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // Basic tab
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'basic',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'basic',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: 'basic',
      to: [{ type: 'capabilityCategory' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'basic',
      rows: 3,
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'basic',
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      group: 'basic',
      of: [taggedImageType([MEDIA_TAG.capability], { hotspot: true })],
    }),

    // Shared Specs tab
    // Helper note at top of tab
    defineField({
      name: 'sharedSpecsNote',
      title: 'About Shared Specs',
      type: 'string',
      group: 'sharedSpecs',
      readOnly: true,
      initialValue:
        'Data authored here is inherited by every capability Item of this type. Items can override individual sections using the Options panel on their Page tab.',
    }),
    defineField({
      name: 'colorRange',
      title: 'Color range',
      type: 'array',
      group: 'sharedSpecs',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', type: 'string', title: 'Color name' },
            { name: 'hex', type: 'string', title: 'Hex code' },
          ],
          preview: { select: { title: 'name', subtitle: 'hex' } },
        },
      ],
    }),
    defineField({
      name: 'thicknessTable',
      title: 'Thickness table',
      type: 'array',
      group: 'sharedSpecs',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'gsm', type: 'number', title: 'GSM' },
            { name: 'caliper', type: 'string', title: 'Caliper (mm)' },
            { name: 'notes', type: 'string', title: 'Notes' },
          ],
          preview: { select: { title: 'gsm', subtitle: 'caliper' } },
        },
      ],
    }),
    defineField({
      name: 'fluteTypeTable',
      title: 'Flute type table',
      type: 'array',
      group: 'sharedSpecs',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'fluteType', type: 'string', title: 'Flute type (e.g. B, C, E)' },
            { name: 'flute', type: 'string', title: 'Flute description' },
            { name: 'liner', type: 'string', title: 'Liner' },
            { name: 'notes', type: 'string', title: 'Notes' },
          ],
          preview: { select: { title: 'fluteType', subtitle: 'notes' } },
        },
      ],
    }),

    // SEO tab
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
    defineField(taggedImageField({
      name: 'ogImage',
      title: 'OG image',
      type: 'image',
      group: 'seo',
      mediaTags: ogMediaTags(MEDIA_TAG.capability),
      options: { hotspot: true },
    })),
  ],
  preview: {
    select: { title: 'title', category: 'category.title' },
    prepare({ title, category }) {
      return { title, subtitle: category }
    },
  },
})
