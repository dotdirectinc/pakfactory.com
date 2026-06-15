import { defineField, defineType } from 'sanity'
import { BookIcon } from '@sanity/icons'
import { blockRowIcon } from './page-builder-preview';

/**
 * postSpotlightRow — a curated set of posts highlighted in a spotlight layout (a
 * lead post plus supporting posts). Page-builder block
 * (apps/blog components/blocks/post-spotlight-row).
 */
export const postSpotlightRow = defineType({
  name: 'postSpotlightRow',
  title: 'Post — Spotlight Row',
  type: 'object',
  icon: BookIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Optional. Defaults to "Spotlight".',
    }),
    defineField({
      name: 'posts',
      title: 'Spotlight posts',
      type: 'array',
      description: 'Manually curated posts. The first is the lead; the rest are supporting.',
      of: [{ type: 'reference', to: [{ type: 'post' }] }],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { heading: 'heading', lead: 'posts.0.title', count: 'posts.length' },
    prepare({ heading, lead, count }) {
      return {
        media: blockRowIcon('postSpotlightRow'),
        title: heading || 'Post — Spotlight Row',
        subtitle: lead ? `${lead}${count ? ` (+${count - 1} more)` : ''}` : 'No posts selected',
      }
    },
  },
})
