import { ImageIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const caseStudyImage = defineType({
  name: 'caseStudyImage',
  title: 'Image',
  type: 'object',
  icon: ImageIcon,
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
      description: 'Describe the image for accessibility and SEO.',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
    defineField({
      name: 'size',
      title: 'Display size',
      type: 'string',
      options: {
        list: [
          { title: 'Full width', value: 'full' },
          { title: 'Wide (75%)', value: 'wide' },
          { title: 'Half (50%)', value: 'half' },
        ],
        layout: 'radio',
      },
      initialValue: 'full',
    }),
  ],
  preview: {
    select: { media: 'image', title: 'caption', alt: 'alt' },
    prepare({ media, title, alt }: { media?: unknown; title?: string; alt?: string }) {
      return { media, title: title ?? alt ?? 'Image' }
    },
  },
})
