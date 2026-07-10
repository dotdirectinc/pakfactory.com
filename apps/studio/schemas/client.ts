import { UserIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

export const client = defineType({
  name: 'client',
  title: 'Client',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Brand name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
      description: 'Brand logo — used on cards, sidebars, and logo walls.',
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      description: 'Canonical outbound URL. Used for the Client-link annotation in case study hero text.',
    }),
    defineField({
      name: 'industry',
      title: 'Industry',
      type: 'reference',
      to: [{ type: 'industry' }],
      description: "The client's primary vertical. Optional — a case study can derive it from this.",
    }),
  ],
  preview: {
    select: { title: 'name', media: 'logo', website: 'website' },
    prepare({ title, media, website }: { title?: string; media?: unknown; website?: string }) {
      return {
        title: title ?? 'Unnamed client',
        subtitle: website ?? '',
        media,
      }
    },
  },
})
