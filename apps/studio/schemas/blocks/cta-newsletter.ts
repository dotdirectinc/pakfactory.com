import { defineField, defineType } from 'sanity'
import { EnvelopeIcon } from '@sanity/icons'
import { blockRowIcon } from './page-builder-preview';

/**
 * ctaNewsletter — newsletter capture call-to-action band. Page-builder block
 * (apps/blog components/blocks/cta-newsletter).
 */
export const ctaNewsletter = defineType({
  name: 'ctaNewsletter',
  title: 'CTA — Newsletter',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Optional. Defaults to "Get the latest packaging digest".',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 2,
      description: 'Optional supporting sentence beneath the heading.',
    }),
  ],
  preview: {
    select: { heading: 'heading' },
    prepare({ heading }) {
      return {
        media: blockRowIcon('ctaNewsletter'), title: 'CTA — Newsletter', subtitle: heading || 'Get the latest packaging digest' }
    },
  },
})
