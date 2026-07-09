import { defineField, defineType } from 'sanity'
import { PlayIcon } from '@sanity/icons'
import { BlockItemPreview } from '../../components/BlockItemPreview'
import {
  dielineBorderFields,
  dielineBorderPreviewSubtitle,
} from '../../lib/dieline-border-fields'

function uniqueVideoRefs(items: { _ref?: string }[] | undefined): true | string {
  if (!items?.length) return true
  const refs = items.map((item) => item._ref).filter(Boolean) as string[]
  if (new Set(refs).size !== refs.length) {
    return 'Each video can only appear once in the grid.'
  }
  return true
}

function videosExcludeLead(
  items: { _ref?: string }[] | undefined,
  context: { parent?: { featuredVideo?: { _ref?: string } } },
): true | string {
  const unique = uniqueVideoRefs(items)
  if (unique !== true) return unique

  const leadRef = context.parent?.featuredVideo?._ref
  if (!leadRef || !items?.length) return true

  const refs = items.map((item) => item._ref).filter(Boolean) as string[]
  if (refs.includes(leadRef)) {
    return 'The featured video is already shown as the lead — remove it from supporting videos.'
  }
  return true
}

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
      name: 'playbackMode',
      title: 'Video playback',
      type: 'string',
      description: 'How video cards play when clicked — applies to the lead and all grid videos.',
      options: {
        list: [
          { title: 'Open in new tab', value: 'newTab' },
          { title: 'Play in dialog (on-site)', value: 'dialog' },
        ],
        layout: 'radio',
      },
      initialValue: 'newTab',
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
      validation: (Rule) =>
        Rule.min(1)
          .max(4)
          .custom((items, context) =>
            videosExcludeLead(items as { _ref?: string }[] | undefined, context),
          ),
    }),
    ...dielineBorderFields(),
  ],
  preview: {
    select: {
      heading: 'heading',
      lead: 'featuredVideo.title',
      count: 'videos.length',
      playbackMode: 'playbackMode',
      showTopBorder: 'showTopBorder',
      showBottomBorder: 'showBottomBorder',
    },
    prepare({ heading, lead, count, playbackMode, showTopBorder, showBottomBorder }) {
      const borders = dielineBorderPreviewSubtitle(showTopBorder, showBottomBorder)
      const mode = playbackMode === 'dialog' ? 'Dialog' : 'New tab'
      const videos = lead
        ? `${lead}${count ? ` (+${count} more)` : ''}`
        : 'No videos selected'
      return {
        title: heading || 'Featured Videos',
        subtitle: [mode, videos, borders].filter(Boolean).join(' · '),
      }
    },
  },
  components: { preview: BlockItemPreview },
})
