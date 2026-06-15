import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField } from '../lib/media-tags'

export const settings = defineType({
  name: 'settings',
  title: 'Global Settings',
  type: 'document',
  // Singleton — only one document of this type ever exists.
  // Exposed in the sidebar via a fixed documentId in the structure builder.
  fields: [
    defineField({
      name: 'siteTitle',
      title: 'Site title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'siteDescription',
      title: 'Site description',
      type: 'text',
      rows: 2,
    }),
    defineField(taggedImageField({
      name: 'defaultOgImage',
      title: 'Default OG image',
      type: 'image',
      mediaTags: ogMediaTags(MEDIA_TAG.website),
      options: { hotspot: true },
    })),
    defineField({
      name: 'primaryCta',
      title: 'Primary CTA',
      type: 'object',
      fields: [
        { name: 'text', type: 'string', title: 'Button text' },
        { name: 'url', type: 'string', title: 'URL or path' },
      ],
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'platform',
              type: 'string',
              title: 'Platform',
              options: {
                list: ['LinkedIn', 'Twitter/X', 'Instagram', 'YouTube', 'Facebook'],
              },
            },
            { name: 'url', type: 'url', title: 'URL' },
          ],
          preview: { select: { title: 'platform', subtitle: 'url' } },
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Global Settings' }
    },
  },
})
