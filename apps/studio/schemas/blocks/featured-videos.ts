import { defineField, defineType } from 'sanity'
import { PlayIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview'
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields'

/**
 * featuredVideos — homepage block curating videoPost documents (lead + grid).
 * Page-builder block (apps/blog components/blocks/featured-videos).
 */
export const featuredVideos = defineType({
  name: 'featuredVideos',
  title: 'Featured Videos',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'Section title, e.g. "Featured Videos".',
      initialValue: 'Featured Videos',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'channelCtaLabel',
      title: 'Channel CTA label',
      type: 'string',
      description: 'Optional link label, e.g. "View more on YouTube".',
    }),
    defineField({
      name: 'channelCtaUrl',
      title: 'Channel CTA URL',
      type: 'url',
      description: 'Optional channel or playlist hub URL.',
    }),
    defineField({
      name: 'featuredVideo',
      title: 'Featured video',
      type: 'reference',
      to: [{ type: 'videoPost' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'videos',
      title: 'Supporting videos',
      type: 'array',
      description: 'Up to four videos shown in the grid beside the lead.',
      of: [{ type: 'reference', to: [{ type: 'videoPost' }] }],
      validation: (Rule) => Rule.min(1).max(4),
    }),
    ...dielineBorderFields(),
  ],
  preview: {
    select: {
      heading: 'heading',
      lead: 'featuredVideo.title',
      count: 'videos.length',
      showTopBorder: 'showTopBorder',
      showBottomBorder: 'showBottomBorder',
    },
    prepare({ heading, lead, count, showTopBorder, showBottomBorder }) {
      const borders = dielineBorderPreviewSubtitle(showTopBorder, showBottomBorder)
      const videos = lead
        ? `${lead}${count ? ` (+${count} more)` : ''}`
        : 'No videos selected'
      return {
        title: heading || 'Featured Videos',
        subtitle: [videos, borders].filter(Boolean).join(' · '),
      }
    },
  },
  components: { preview: BlockItemPreview },
})
