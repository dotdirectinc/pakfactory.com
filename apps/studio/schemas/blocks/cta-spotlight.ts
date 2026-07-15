import { defineField, defineType } from 'sanity'
import { ImageIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview'
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields'
import { linkTargetFields } from '../../lib/link-target-fields'

const borderWidthOptions = {
  list: [
    { title: 'Max width (centered column)', value: 'max' },
    { title: 'Full width (edge to edge)', value: 'full' },
  ],
  layout: 'radio' as const,
}

/**
 * ctaSpotlight — CTA card with heading, body, button, and a single image.
 * The image can render contained (clipped inside the card) or floating
 * (breaking out of the card edge). Background color is chosen from a curated
 * set of brand tokens. Page-builder block (apps/blog components/blocks/cta-spotlight).
 */
export const ctaSpotlight = defineType({
  name: 'ctaSpotlight',
  title: 'CTA — Spotlight',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Main headline shown in the CTA card.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'text',
      rows: 2,
      description: 'Supporting copy below the heading.',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Button label',
      type: 'string',
      description: 'Button text for the call to action.',
    }),
    ...linkTargetFields({ requireLinkType: false }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      description: 'Single image shown alongside the copy.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description:
            'Optional. Describes the image for screen readers and SEO. Leave blank for a decorative image.',
        }),
      ],
    }),
    defineField({
      name: 'imageEffect',
      title: 'Image effect',
      type: 'string',
      initialValue: 'contained',
      options: {
        list: [
          { title: 'Contained (clipped inside the card)', value: 'contained' },
          { title: 'Floating (breaks out of the card)', value: 'floating' },
        ],
        layout: 'radio',
      },
      description:
        'Contained keeps the image inside the card; floating lets it overflow the card edge.',
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Background color',
      type: 'color',
      description:
        'Optional. Card background. Defaults to brand green when empty.',
      options: { disableAlpha: true },
    }),
    ...dielineBorderFields(),
    defineField({
      name: 'topBorderWidth',
      title: 'Top dashed border width',
      type: 'string',
      initialValue: 'max',
      options: borderWidthOptions,
      hidden: ({ parent }) => parent?.showTopBorder === false,
      description:
        'Full width spans the viewport; max width aligns to the centered content column.',
    }),
    defineField({
      name: 'bottomBorderWidth',
      title: 'Bottom dashed border width',
      type: 'string',
      initialValue: 'max',
      options: borderWidthOptions,
      hidden: ({ parent }) => parent?.showBottomBorder === false,
      description:
        'Full width spans the viewport; max width aligns to the centered content column.',
    }),
  ],
  preview: {
    select: {
      heading: 'heading',
      media: 'image',
      showTopBorder: 'showTopBorder',
      showBottomBorder: 'showBottomBorder',
    },
    prepare({ heading, media, showTopBorder, showBottomBorder }) {
      const borders = dielineBorderPreviewSubtitle(showTopBorder, showBottomBorder)
      return {
        title: 'CTA — Spotlight',
        subtitle: [heading || 'Spotlight CTA', borders].filter(Boolean).join(' · '),
        media,
      }
    },
  },
  components: { preview: BlockItemPreview },
})
