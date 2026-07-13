import { defineField, defineType } from 'sanity'
import { CommentIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview'
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields'
import { linkTargetFields } from '../../lib/link-target-fields'

/**
 * ctaTextAndButton — message + button CTA with left/center/right alignment.
 * Footer page-builder block (blogNavigation.footerNavigation.builder).
 */
export const ctaTextAndButton = defineType({
  name: 'ctaTextAndButton',
  title: 'CTA — Text and Button',
  type: 'object',
  icon: CommentIcon,
  fields: [
    defineField({
      name: 'message',
      title: 'Message',
      type: 'text',
      rows: 2,
      description: 'Heading above the button. Line breaks are preserved.',
    }),
    defineField({
      name: 'buttonLabel',
      title: 'Button label',
      type: 'string',
    }),
    defineField({
      name: 'align',
      title: 'Alignment',
      type: 'string',
      description: 'Horizontal alignment of the message and button.',
      initialValue: 'center',
      options: {
        list: [
          { title: 'Left', value: 'left' },
          { title: 'Center', value: 'center' },
          { title: 'Right', value: 'right' },
        ],
        layout: 'radio',
      },
    }),
    ...linkTargetFields({ requireLinkType: false }),
    ...dielineBorderFields(),
  ],
  preview: {
    select: {
      message: 'message',
      buttonLabel: 'buttonLabel',
      align: 'align',
      showTopBorder: 'showTopBorder',
      showBottomBorder: 'showBottomBorder',
    },
    prepare({ message, buttonLabel, align, showTopBorder, showBottomBorder }) {
      const alignLabel =
        align === 'left' ? 'left' : align === 'right' ? 'right' : 'center'
      const borders = dielineBorderPreviewSubtitle(showTopBorder, showBottomBorder)
      return {
        title: 'CTA — Text and Button',
        subtitle: [message || 'Untitled', buttonLabel, alignLabel, borders]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
  components: { preview: BlockItemPreview },
})
