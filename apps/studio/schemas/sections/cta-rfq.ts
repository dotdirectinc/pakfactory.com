import { defineField, defineType } from 'sanity'
import { RocketIcon } from '@sanity/icons'
import { SectionItemPreview } from '../../components/SectionItemPreview';

/**
 * ctaRfq — quote / RFQ consultative call-to-action band. Page-builder section
 * (apps/blog components/sections/cta-rfq).
 */
export const ctaRfq = defineType({
  name: 'ctaRfq',
  title: 'CTA — RFQ / Quote',
  type: 'object',
  icon: RocketIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Optional. Defaults to "Need custom packaging?".',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 2,
      description: 'Optional supporting sentence beneath the heading.',
    }),
    defineField({
      name: 'ctaHref',
      title: 'Button URL',
      type: 'url',
      description:
        'Optional. Destination for the "Get a quote" button. Defaults to the main site contact page.',
      validation: (Rule) =>
        Rule.uri({ allowRelative: true, scheme: ['http', 'https'] }),
    }),
  ],
  preview: {
    select: { heading: 'heading' },
    prepare({ heading }) {
      return {
        title: 'CTA — RFQ / Quote', subtitle: heading || 'Need custom packaging?' }
    },
  },
  components: { preview: SectionItemPreview },
})
