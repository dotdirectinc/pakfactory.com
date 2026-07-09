import { ImageIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const caseStudyImageGallery = defineType({
  name: 'caseStudyImageGallery',
  title: 'Image Gallery',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'galleryItem',
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
              name: 'caption',
              title: 'Caption',
              type: 'string',
            }),
          ],
          preview: {
            select: { media: 'image', title: 'caption' },
            prepare({ media, title }: { media?: unknown; title?: string }) {
              return { media, title: title ?? 'Image' }
            },
          },
        },
      ],
      validation: (Rule) =>
        Rule.required().min(2).error('A gallery requires at least 2 images.'),
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Aspect Ratio',
      type: 'string',
      options: {
        list: [
          { title: '16:9 — Landscape', value: '16:9' },
          { title: '1:1 — Square', value: '1:1' },
        ],
        layout: 'radio',
      },
      initialValue: '16:9',
    }),
  ],
  preview: {
    select: { images: 'images', ratio: 'aspectRatio' },
    prepare({ images, ratio }: { images?: unknown[]; ratio?: string }) {
      const count = images?.length ?? 0
      return {
        title: 'Image Gallery',
        subtitle: `${count} image${count !== 1 ? 's' : ''} · ${ratio ?? '16:9'}`,
        media: ImageIcon,
      }
    },
  },
})
