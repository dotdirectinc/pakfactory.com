import { BlockquoteIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const testimonialBlock = defineType({
  name: 'testimonialBlock',
  title: 'Testimonial',
  type: 'object',
  icon: BlockquoteIcon,
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'attributionName',
      title: 'Name',
      type: 'string',
      description: 'e.g. Jane Smith',
    }),
    defineField({
      name: 'attributionRole',
      title: 'Role',
      type: 'string',
      description: 'e.g. Founder at Venture Co.',
    }),
    defineField({
      name: 'backgroundImage',
      title: 'Background image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'backgroundImageAlt',
      title: 'Background image alt',
      type: 'string',
      hidden: ({ parent }) => !parent?.backgroundImage,
    }),
  ],
  preview: {
    select: { quote: 'quote', name: 'attributionName' },
    prepare({ quote, name }: { quote?: string; name?: string }) {
      return {
        title: name ? `"${quote?.slice(0, 50)}…" — ${name}` : (quote?.slice(0, 60) ?? 'Testimonial'),
        media: BlockquoteIcon,
      }
    },
  },
})
