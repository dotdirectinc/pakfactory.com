import { defineField, defineType } from 'sanity'
import { StarIcon } from '@sanity/icons'

// ─────────────────────────────────────────────────────────────────────────────
// EXPERTISE STAGE — placeholder schema
// Full schema design pending. Each stage = one of PakFactory's 6-stage
// service lifecycle (Strategy, Design, Prototyping, Manufacturing,
// Logistics, Fulfillment). See wiki: company/knowledge/Expertise.md
// ─────────────────────────────────────────────────────────────────────────────

export const expertiseStage = defineType({
  name: 'expertiseStage',
  title: 'Expertise Stage',
  type: 'document',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'order',
      title: 'Stage order',
      type: 'number',
      description: '1 = Strategy, 2 = Design, 3 = Prototyping, 4 = Manufacturing, 5 = Logistics, 6 = Fulfillment',
      validation: (Rule) => Rule.required().min(1).max(6).integer(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Future', value: 'future' },
          { title: 'Deprecated', value: 'deprecated' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
    }),
  ],
  orderings: [
    { title: 'Stage order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', order: 'order' },
    prepare({ title, order }) {
      return { title: title ?? 'Untitled stage', subtitle: order ? `Stage ${order}` : '' }
    },
  },
})
