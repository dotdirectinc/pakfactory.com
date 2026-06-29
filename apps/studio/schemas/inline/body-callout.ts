import { InfoOutlineIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

const CALLOUT_TONE_LABELS: Record<string, string> = {
  info: 'Info',
  tip: 'Tip',
  warning: 'Warning',
  success: 'Success',
}

/**
 * bodyCallout — inline callout block for use inside Portable Text body fields.
 *
 * One-off content authored in place (like bodyImage). Not a reusable widget —
 * use widgetEmbed + contentWidget for CTA and product-card blocks instead.
 *
 * Part of the `inline/` group (inline body blocks). Register new inline blocks in
 * `schemas/inline/index.ts` and they auto-join the post body `of` array.
 */
export const bodyCallout = defineType({
  name: 'bodyCallout',
  title: 'Callout',
  type: 'object',
  icon: InfoOutlineIcon,
  fields: [
    defineField({
      name: 'calloutTone',
      title: 'Tone',
      type: 'string',
      description: 'Visual style of the callout.',
      options: {
        list: [
          { title: 'Info', value: 'info' },
          { title: 'Tip', value: 'tip' },
          { title: 'Warning', value: 'warning' },
          { title: 'Success', value: 'success' },
        ],
        layout: 'radio',
      },
      initialValue: 'info',
    }),
    defineField({
      name: 'calloutTitle',
      title: 'Title',
      type: 'string',
      description: 'Optional heading shown above the callout body.',
    }),
    defineField({
      name: 'calloutBody',
      title: 'Body',
      type: 'array',
      description: 'Callout content. Supports bold, italic, and links.',
      of: [
        {
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  }),
                ],
              },
            ],
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1).error('Callout body is required.'),
    }),
  ],
  preview: {
    select: {
      tone: 'calloutTone',
      title: 'calloutTitle',
    },
    prepare({ tone, title }) {
      const toneLabel = CALLOUT_TONE_LABELS[tone ?? 'info'] ?? 'Info'
      return {
        title: title || 'Callout',
        subtitle: toneLabel,
        media: InfoOutlineIcon,
      }
    },
  },
})
