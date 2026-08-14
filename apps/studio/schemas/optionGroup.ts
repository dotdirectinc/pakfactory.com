import { defineField, defineType } from 'sanity'
import { ThLargeIcon } from '@sanity/icons'

/**
 * A reusable spec-table definition — the named columns a table carries.
 *
 * This is the piece that makes Customization Types self-serve: the deployed
 * draft hard-coded one field per table (color range, thickness, flute type),
 * so every new kind of table was a schema change. One generic definition
 * replaces all three, and adding a table becomes content work.
 *
 * The division of labour, per D30:
 *   Option Group        defines the columns
 *   Customization Type  declares which tables apply, and their cardinality
 *   Customization Option states its own complete rows
 *
 * Nothing is inherited and nothing resolves at read time — the front end
 * reads the Option only.
 */

/**
 * The five column types are a deliberate ceiling. If a table seems to need a
 * sixth, the question to ask is whether it is really an option table — not how
 * to extend the palette.
 */
export const OPTION_COLUMN_TYPES = [
  { title: 'Text', value: 'text' },
  { title: 'Number', value: 'number' },
  { title: 'Colour', value: 'color' },
  { title: 'Image', value: 'image' },
  { title: 'Yes / no', value: 'boolean' },
] as const

export const optionGroup = defineType({
  name: 'optionGroup',
  title: 'Option group',
  type: 'document',
  icon: ThLargeIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The table\'s name, as an editor sees it — "Thickness", "Colour range".',
      validation: (Rule) => Rule.required(),
    }),

    defineField({
      name: 'columns',
      title: 'Columns',
      type: 'array',
      description:
        'The columns every option filling in this table states a value for. Order here is the order they appear in.',
      validation: (Rule) => Rule.required().min(1),
      of: [{
        type: 'object',
        name: 'optionColumn',
        fields: [
          defineField({
            name: 'name',
            title: 'Column name',
            type: 'string',
            description: 'The column heading — "GSM", "Caliper (mm)", "Notes".',
            validation: (Rule) => Rule.required(),
          }),
          defineField({
            name: 'type',
            title: 'Type of value',
            type: 'string',
            description: 'What kind of value this column holds. Five types, and no more.',
            options: { list: [...OPTION_COLUMN_TYPES] },
            initialValue: 'text',
            validation: (Rule) => Rule.required(),
          }),
        ],
        preview: {
          select: { title: 'name', subtitle: 'type' },
        },
      }],
    }),
  ],

  preview: {
    select: { title: 'title', columns: 'columns' },
    prepare({ title, columns }) {
      const count = Array.isArray(columns) ? columns.length : 0
      return {
        title: title ?? 'Untitled option group',
        subtitle: count === 1 ? '1 column' : `${count} columns`,
      }
    },
  },
})
