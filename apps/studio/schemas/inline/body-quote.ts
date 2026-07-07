import { BlockquoteIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

/**
 * bodyQuote — inline pull-quote block for use inside Portable Text body fields.
 *
 * One-off content authored in place (like bodyCallout / bodyImage). Not a
 * reusable widget — use widgetEmbed + contentWidget for shared blocks instead.
 *
 * Part of the `inline/` group (inline body blocks). Register new inline blocks in
 * `schemas/inline/index.ts` and they auto-join the post body `of` array.
 */
export const bodyQuote = defineType({
  name: 'bodyQuote',
  title: 'Quote',
  type: 'object',
  icon: BlockquoteIcon,
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      description: 'The pull-quote text — keep it short and punchy.',
      validation: (Rule) => Rule.required().min(1).error('Quote text is required.'),
    }),
    defineField({
      name: 'attribution',
      title: 'Attribution',
      type: 'string',
      description:
        'Optional source line shown below the quote (e.g. "Analyst quote • Contact for sourcing"). Rendered uppercase with a leading dash.',
    }),
  ],
  preview: {
    select: {
      quote: 'quote',
      attribution: 'attribution',
    },
    prepare({ quote, attribution }) {
      return {
        title: quote || 'Quote',
        subtitle: attribution || 'Pull-quote',
        media: BlockquoteIcon,
      }
    },
  },
})
