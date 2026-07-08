import { ImagesIcon } from '@sanity/icons'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { MEDIA_TAG, taggedImageType } from '../../lib/media-tags'

/**
 * bodyGallery — inline two-up image gallery for the post Portable Text body.
 *
 * One-off content authored in place (like bodyImage / bodyCallout). Two images
 * side by side with a shared caption; stacks on mobile. Register in
 * `schemas/inline/index.ts` to auto-join the post body `of` array.
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
      description: 'Exactly two images, shown side by side (stacked on mobile).',
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
      validation: (Rule) =>
        Rule.required().min(2).max(2).error('Add exactly two images.'),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption shown below both images.',
    }),
  ],
  preview: {
    select: { media: 'images.0.asset', caption: 'caption', alt0: 'images.0.alt' },
    prepare({ media, caption, alt0 }) {
      return {
        title: caption || 'Image gallery',
        subtitle: alt0 ? `2 images · ${alt0}` : '2 images',
        media,
      }
    },
  },
})
