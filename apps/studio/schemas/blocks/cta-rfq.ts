import { defineField, defineType } from 'sanity'
import { RocketIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview';
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields';

/**
 * ctaRfq — quote / RFQ consultative call-to-action band. Page-builder block
 * (apps/blog components/blocks/cta-rfq).
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
    ...dielineBorderFields(),
  ],
  preview: {
    select: {
      heading: 'heading',
      showTopBorder: 'showTopBorder',
      showBottomBorder: 'showBottomBorder',
    },
    prepare({ heading, showTopBorder, showBottomBorder }) {
      const borders = dielineBorderPreviewSubtitle(showTopBorder, showBottomBorder)
      return {
        title: 'CTA — RFQ / Quote',
        subtitle: [heading || 'Need custom packaging?', borders].filter(Boolean).join(' · '),
      }
    },
  },
  components: { preview: BlockItemPreview },
})
