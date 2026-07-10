import { ImagesIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const caseStudyGalleryBlock = defineType({
  name: 'caseStudyGalleryBlock',
  title: 'Gallery',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'galleryImage',
          title: 'Image',
          fields: [
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description: 'Describe the image for accessibility.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
              description: 'Optional label shown below the image, e.g. "Insert" or "Tab opening".',
            }),
          ],
          preview: {
            select: { media: 'image', title: 'alt', caption: 'caption' },
            prepare({ media, title, caption }: { media?: unknown; title?: string; caption?: string }) {
              return { media, title: caption ?? title ?? 'Image' }
            },
          },
        },
      ],
      validation: (Rule) =>
        Rule.required().min(2).error('Add at least two images to the gallery.'),
    }),
    defineField({
      name: 'displayStyle',
      title: 'Display style',
      type: 'string',
      options: {
        list: [
          { title: 'Two up (2-column grid)', value: 'twoUp' },
          { title: 'Full width', value: 'fullWidth' },
          { title: 'Stacked (single column)', value: 'stacked' },
        ],
        layout: 'radio',
      },
      initialValue: 'twoUp',
    }),
  ],
  preview: {
    select: { images: 'images', style: 'displayStyle' },
    prepare({ images, style }: { images?: unknown[]; style?: string }) {
      const count = images?.length ?? 0
      const styleLabel = style === 'fullWidth' ? 'Full width' : style === 'stacked' ? 'Stacked' : 'Two up'
      return {
        title: 'Gallery',
        subtitle: `${count} image${count !== 1 ? 's' : ''} · ${styleLabel}`,
        media: ImagesIcon,
      }
    },
  },
})
