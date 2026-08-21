import { defineField, defineType } from 'sanity'
import { CommentIcon } from '@sanity/icons'

/**
 * Testimonial — a client quote, stored once (Entities/Testimonial.md). The words
 * plus who said them, reusable on a case study, a client page, a product line or
 * the homepage without being retyped. No page of its own.
 *
 * The company name and logo resolve through `client`, so `personRole` is the role
 * ONLY — "Founder", never "Founder at Ammu Beauty". No `caseStudy` back-reference
 * (derivable — ask which study references this) and no `order` (ordering lives on
 * whatever page lists them).
 */
export const testimonial = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  icon: CommentIcon,
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      description: 'The client’s words, one paragraph. Plain text on purpose — a testimonial isn’t formatted.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'personName',
      title: 'Name',
      type: 'string',
      description: 'Who said it.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'personRole',
      title: 'Role',
      type: 'string',
      description: 'Role only — "Founder", never "Founder at Ammu Beauty". The company comes from the Client.',
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'reference',
      to: [{ type: 'client' }],
      description: 'The company — its name and logo resolve through this. Required.',
      options: { disableNew: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'portrait',
      title: 'Portrait',
      type: 'image',
      options: { hotspot: true },
      description: 'Optional photo of the person. Not packaging photography — that belongs to whatever block displays the quote.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describes the person for screen readers. Falls back to the name when empty.',
        }),
      ],
    }),
  ],
  preview: {
    select: { quote: 'quote', name: 'personName', client: 'client.name', media: 'portrait' },
    prepare({ quote, name, client, media }) {
      const who = [name, client].filter(Boolean).join(' · ')
      return {
        title: who || 'Testimonial',
        subtitle: quote ? `“${String(quote).slice(0, 60)}${String(quote).length > 60 ? '…' : ''}”` : undefined,
        media,
      }
    },
  },
})
