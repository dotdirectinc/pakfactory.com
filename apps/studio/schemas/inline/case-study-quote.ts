import { CommentIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const caseStudyQuote = defineType({
  name: 'caseStudyQuote',
  title: 'Quote',
  type: 'object',
  icon: CommentIcon,
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author Name',
      type: 'string',
    }),
    defineField({
      name: 'role',
      title: 'Role / Title',
      type: 'string',
    }),
    defineField({
      name: 'photo',
      title: 'Author Photo',
      type: 'image',
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: { quote: 'quote', author: 'author' },
    prepare({ quote, author }: { quote?: string; author?: string }) {
      const q = quote ?? ''
      const display = q.length > 70 ? `"${q.slice(0, 70)}…"` : q ? `"${q}"` : 'Quote'
      return {
        title: display,
        subtitle: author ?? 'No attribution',
        media: CommentIcon,
      }
    },
  },
})
