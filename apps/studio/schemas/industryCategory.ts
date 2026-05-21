import { defineField, defineType } from 'sanity'

export const industryCategory = defineType({
  name: 'industryCategory',
  title: 'Industry Segment',
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
      name: 'industry',
      title: 'Parent industry',
      type: 'reference',
      to: [{ type: 'industry' }],
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
    }),
  ],
  preview: {
    select: { title: 'title', industry: 'industry.title' },
    prepare({ title, industry }) {
      return { title, subtitle: industry }
    },
  },
})
