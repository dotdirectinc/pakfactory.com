import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, taggedImageType } from '../lib/media-tags'

/**
 * bodyImage — enriched image block for use inside Portable Text body fields.
 *
 * Replaces the bare { type: 'image' } block with:
 *   - alt text (required — accessibility + Google Images SEO)
 *   - caption (optional editorial context shown below the image)
 *   - optional outbound link wrapping the image
 *   - nofollow toggle on that link (rel="nofollow" tells Google not to pass PageRank)
 */
export const bodyImage = defineType({
  name: 'bodyImage',
  title: 'Image',
  type: 'object',
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
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional short caption shown below the image in the frontend.',
    }),
    defineField({
      name: 'link',
      title: 'Link URL',
      type: 'url',
      description: 'Optional. If set, the image becomes a clickable link.',
      validation: (Rule) =>
        Rule.uri({ scheme: ['https', 'http'] }).warning('Use a full URL including https://'),
    }),
    defineField({
      name: 'linkNofollow',
      title: 'Nofollow link',
      type: 'boolean',
      description:
        'Add rel="nofollow" to the image link. Use for sponsored, UGC, or untrusted outbound links.',
      initialValue: false,
      hidden: ({ parent }) => !parent?.link,
    }),
  ],
  preview: {
    select: {
      media: 'asset',
      alt: 'alt',
      caption: 'caption',
    },
    prepare({ media, alt, caption }) {
      return {
        title: alt || 'Image (no alt text)',
        subtitle: caption || '',
        media,
      }
    },
  },
})
