import { ThListIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'

/**
 * bodyTable — inline data table for the post Portable Text body.
 *
 * One-off content authored in place. Up to 4 columns and 2–10 rows; cells are
 * plain text, one value per column in order. The renderer normalizes each row
 * to the column count (pads short rows, ignores extras) so it degrades
 * gracefully. Register in `schemas/inline/index.ts` to auto-join the post body.
 */
export const bodyTable = defineType({
  name: 'bodyTable',
  title: 'Data table',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({
      name: 'columns',
      title: 'Column headers',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Up to 4 column headers, left to right.',
      validation: (Rule) =>
        Rule.required().min(1).max(4).error('Use between 1 and 4 columns.'),
    }),
    defineField({
      name: 'rows',
      title: 'Rows',
      type: 'array',
      description: 'Between 2 and 10 rows.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'tableRow',
          fields: [
            defineField({
              name: 'cells',
              title: 'Cells',
              type: 'array',
              of: [{ type: 'string' }],
              description: 'One value per column, in the same order as the headers.',
              validation: (Rule) => Rule.required().min(1).max(4),
            }),
          ],
          preview: {
            select: { cells: 'cells' },
            prepare({ cells }) {
              const list = Array.isArray(cells) ? cells.filter(Boolean) : []
              return { title: list.join(' · ') || 'Empty row' }
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.required().min(2).max(10).error('Add between 2 and 10 rows.'),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption / source line shown below the table.',
    }),
  ],
  preview: {
    select: { columns: 'columns', rows: 'rows', caption: 'caption' },
    prepare({ columns, rows, caption }) {
      const colCount = Array.isArray(columns) ? columns.length : 0
      const rowCount = Array.isArray(rows) ? rows.length : 0
      return {
        title: caption || 'Data table',
        subtitle: `${rowCount} row(s) × ${colCount} column(s)`,
      }
    },
  },
})
