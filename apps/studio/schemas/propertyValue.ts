import { defineField, defineType } from 'sanity'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'

export const propertyValue = defineType({
  name: 'propertyValue',
  title: 'Property Value',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'property',
      title: 'Property',
      type: 'reference',
      to: [{ type: 'property' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'value',
      title: 'Value / label',
      type: 'string',
      description: 'Optional machine-readable value (e.g. hex code for colors).',
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
    }),
  ],
  preview: {
    select: { title: 'title', group: 'property.title' },
    prepare({ title, group }) {
      return { title, subtitle: group }
    },
  },
  orderings: [
    {
      title: 'Group → order',
      name: 'groupOrder',
      by: [
        { field: 'property.title', direction: 'asc' },
        { field: 'order', direction: 'asc' },
      ],
    },
  ],
})
