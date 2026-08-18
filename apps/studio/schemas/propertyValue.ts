import { defineField, defineType } from 'sanity'
import { uniqueTaxonomyTitle } from '../lib/taxonomy-rules'

export const propertyValue = defineType({
  name: 'propertyValue',
  title: 'Property Value',
  type: 'document',
  // §2.4: Property Value is a Content-only type — its single parent reference
  // stays with the content rather than earning a Categorization tab.
  groups: [{ name: 'content', title: 'Content', default: true }],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The value an editor picks — e.g. "Matte", "300 GSM", "Kraft".',
      validation: (Rule) => Rule.required().custom(uniqueTaxonomyTitle()),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      description: 'URL-safe identifier, generated from the title.',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'property',
      title: 'Property',
      type: 'reference',
      group: 'content',
      description: 'The Property this is a value of (its parent) — required.',
      to: [{ type: 'property' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'One sentence on what this value means, for the content team.',
    }),
    defineField({
      name: 'value',
      title: 'Value / label',
      type: 'string',
      group: 'content',
      description: 'Optional machine-readable value (e.g. hex code for colours).',
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'content',
      description: 'Lower numbers sort first within the parent property.',
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
