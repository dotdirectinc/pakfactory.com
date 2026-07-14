import { defineField, defineType } from 'sanity'

export const attribute = defineType({
  name: 'attribute',
  title: 'Attribute',
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
      name: 'attributeGroup',
      title: 'Attribute group',
      type: 'reference',
      to: [{ type: 'attributeGroup' }],
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
    select: { title: 'title', group: 'attributeGroup.title' },
    prepare({ title, group }) {
      return { title, subtitle: group }
    },
  },
  orderings: [
    {
      title: 'Group → order',
      name: 'groupOrder',
      by: [
        { field: 'attributeGroup.title', direction: 'asc' },
        { field: 'order', direction: 'asc' },
      ],
    },
  ],
})
