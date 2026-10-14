import {defineField, defineType} from 'sanity'
import {EarthGlobeIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'

/**
 * News Coverage — an article about PakFactory, published by somebody else
 * (PROD-2909). A row in the newsroom's "In the news" list; the card links out.
 *
 * Its own type rather than a flag on `pressRelease`: a third-party article has
 * no body, no slug and no page of ours, so folding it in would need a
 * discriminator that makes half the fields meaningless on each half of the
 * documents.
 *
 * 🔴 Never host the article text. Republishing a third-party article is
 * copyright infringement with or without credit, and it is duplicate content
 * that competes with the original and loses. A coverage row is a link.
 */
export const newsCoverage = defineType({
  name: 'newsCoverage',
  title: 'News Coverage',
  type: 'document',
  icon: EarthGlobeIcon,
  groups: groupsFor(['content']),
  fields: [
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      group: GROUPS.content,
      description: 'The article’s headline, as the outlet published it.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'outlet',
      title: 'Outlet',
      type: 'string',
      group: GROUPS.content,
      description: 'The publication that ran it — for example "Packaging Dive".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'outletLogo',
      title: 'Outlet logo',
      type: 'image',
      group: GROUPS.content,
      options: {hotspot: true},
      description: 'Optional outlet logo for the card.',
    }),
    defineField({
      name: 'url',
      title: 'Article URL',
      type: 'url',
      group: GROUPS.content,
      description: 'Link to the article on the outlet’s own site. Opens in a new tab.',
      validation: (Rule) => Rule.required().uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publish date',
      type: 'date',
      group: GROUPS.content,
      description: 'The date the outlet published it. Sorts the list.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 2,
      group: GROUPS.content,
      description:
        'Optional short pull quote from the article. Keep it to a sentence — we link to the ' +
        'original rather than reproducing it.',
    }),
  ],
  preview: {
    select: {
      title: 'headline',
      outlet: 'outlet',
      publishedAt: 'publishedAt',
      media: 'outletLogo',
    },
    prepare({title, outlet, publishedAt, media}) {
      const date = publishedAt
        ? new Date(publishedAt).toLocaleDateString()
        : 'No date'
      return {
        title: title || 'Untitled coverage',
        subtitle: `${outlet || 'No outlet'} · ${date}`,
        media: media || EarthGlobeIcon,
      }
    },
  },
  orderings: [
    {
      title: 'Published (newest first)',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
  ],
})
