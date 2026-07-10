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
      name: 'aspectRatio',
      title: 'Image aspect ratio',
      type: 'string',
      description: '16:9 for landscape photos; 1:1 for square crops.',
      initialValue: '16:9',
      options: {
        list: [
          { title: 'Landscape (16:9)', value: '16:9' },
          { title: 'Square (1:1)', value: '1:1' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption shown below the entire gallery.',
    }),
  ],
  preview: {
    select: { images: 'images', aspectRatio: 'aspectRatio' },
    prepare({ images, aspectRatio }: { images?: unknown[]; aspectRatio?: string }) {
      const count = images?.length ?? 0
      const ratio = aspectRatio === '1:1' ? '1:1' : '16:9'
      return {
        title: 'Gallery',
        subtitle: `${count} image${count !== 1 ? 's' : ''} · ${ratio}`,
        media: ImagesIcon,
      }
    },
  },
})
