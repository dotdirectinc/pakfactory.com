import { defineField, defineType } from 'sanity'

export const capabilityCategory = defineType({
  name: 'capabilityCategory',
  title: 'Customization Category',
  type: 'document',
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
      rows: 3,
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      description: 'Lower numbers appear first in the sidebar.',
    }),
  ],
  preview: {
    select: { title: 'title', order: 'order' },
    prepare({ title, order }) {
      return { title, subtitle: order !== undefined ? `Order: ${order}` : '' }
    },
  },
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
})
