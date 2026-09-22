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
      description:
        'The brand logo, shown on case studies and anywhere clients are listed. ' +
        'Without one, the name shows instead.',
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      description:
        'The client\'s own website. Their logo links to it, and the "Client link" button in the ' +
        'intro uses it.',
    }),
    defineField({
      name: 'industry',
      title: 'Industry',
      type: 'reference',
      to: [{ type: 'solution' }],
      options: {
        filter: 'solutionType == "industry"',
      },
      description:
        "The client's industry, chosen from Solutions. Optional. It filters the case-study " +
        "listing and shows as a chip on the study.",
    }),
  ],
  preview: {
    select: {
      title: 'name',
      media: 'logo',
      website: 'website',
      industryHeadline: 'industry.headline',
      industryInternal: 'industry.internalTitle',
    },
    prepare({
      title,
      media,
      website,
      industryHeadline,
      industryInternal,
    }: {
      title?: string
      media?: unknown
      website?: string
      industryHeadline?: string
      industryInternal?: string
    }) {
      const industryTitle = industryHeadline || industryInternal
      return {
        title: title ?? 'Unnamed client',
        subtitle: [industryTitle, website].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
