import { ImagesIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { MEDIA_TAG, taggedImageType } from '../../lib/media-tags'

/**
 * bodyGallery — horizontally scrollable image gallery for the post body.
 *
 * Minimum 2 images, no upper limit. Each image is shown at ~75% of the
 * viewport width so readers see one full image and a peek at the next.
 * Aspect ratio (16:9 or 1:1) controls how each image is cropped.
 */
export const bodyGallery = defineType({
  name: 'bodyGallery',
  title: 'Image gallery',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      description: 'Minimum 2 images. Readers scroll horizontally through the gallery.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'galleryImage',
          fields: [
            defineField({
              name: 'asset',
              title: 'Image',
              ...taggedImageType([MEDIA_TAG.blog], { hotspot: true }),
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description:
                'Describe the image for screen readers and Google Images. Required. Keep under 125 characters.',
              validation: (Rule) =>
                Rule.required()
                  .min(5)
                  .max(125)
                  .warning('Alt text should be between 5 and 125 characters.'),
            }),
          ],
          preview: {
            select: { media: 'asset', alt: 'alt' },
            prepare({ media, alt }) {
              return { title: alt || 'Image (no alt text)', media }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(2).error('Add at least two images.'),
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
      description: 'Optional caption shown below the gallery.',
    }),
  ],
  preview: {
    select: {
      media: 'images.0.asset',
      caption: 'caption',
      alt0: 'images.0.alt',
      count: 'images',
      aspectRatio: 'aspectRatio',
    },
    prepare({ media, caption, alt0, count, aspectRatio }) {
      const n = Array.isArray(count) ? count.length : 0
      const ratio = aspectRatio === '1:1' ? '1:1' : '16:9'
      return {
        title: caption || 'Image gallery',
        subtitle: `${n} image${n !== 1 ? 's' : ''} · ${ratio}${alt0 ? ` · ${alt0}` : ''}`,
        media,
      }
    },
  },
})
