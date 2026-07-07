import { defineArrayMember, defineField, defineType } from 'sanity'
import { SparklesIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview'
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields'

/**
 * promoBanner — green full-width promo card with heading, body, CTA, and up to 2 images.
 * Page-builder block (apps/blog components/blocks/promo-banner).
 */
export const promoBanner = defineType({
  name: 'promoBanner',
  title: 'Promo Banner',
  type: 'object',
  icon: SparklesIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Main headline shown in the promo card.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 3,
      description: 'Supporting copy below the heading.',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA label',
      type: 'string',
      description: 'Button text for the call to action.',
    }),
    defineField({
      name: 'ctaUrl',
      title: 'CTA URL',
      type: 'string',
      description: 'Relative path (e.g. /contact) or a full URL.',
    }),
    defineField({
      name: 'images',
      title: 'Images (up to 2)',
      type: 'array',
      of: [defineArrayMember({ type: 'image', options: { hotspot: true } })],
      validation: (Rule) => Rule.max(2),
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
        title: 'Promo Banner',
        subtitle: [heading || 'Custom packaging, made simple', borders]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
  components: { preview: BlockItemPreview },
})
