import { defineField, defineType } from 'sanity'
import { PlayIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField } from '../lib/media-tags'
import { CHANNEL_OPTIONS } from '../lib/channels'

const SOURCE_TYPES = [
  { title: 'External platform (YouTube, Vimeo, …)', value: 'external' },
  { title: 'Hosted in Sanity (uploaded file)', value: 'hosted' },
] as const

const PLATFORMS = [
  { title: 'YouTube', value: 'youtube' },
  { title: 'Vimeo', value: 'vimeo' },
  { title: 'Wistia', value: 'wistia' },
  { title: 'Other', value: 'other' },
] as const

/**
 * videoPost — reusable video library entry referenced by page-builder blocks.
 * Supports external platform URLs or Sanity-hosted video files.
 */
export const videoPost = defineType({
  name: 'videoPost',
  title: 'Video Post',
  type: 'document',
  icon: PlayIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'source', title: 'Source' },
    { name: 'publishing', title: 'Publishing' },
  ],
  fields: [
    // ── Content ──────────────────────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'content',
      description:
        'Short summary for cards and VideoObject JSON-LD. Required for Google Rich Results.',
    }),
    defineField(
      taggedImageField({
        name: 'thumbnail',
        title: 'Thumbnail / poster',
        type: 'image',
        group: 'content',
        mediaTags: [MEDIA_TAG.blog],
        options: { hotspot: true },
        description:
          'Optional for YouTube (auto-derived). Recommended for Vimeo, Wistia, other, and hosted videos.',
      }),
    ),
    defineField({
      name: 'duration',
      title: 'Duration',
      type: 'string',
      group: 'content',
      description: 'Display hint, e.g. "4:32". Used in VideoObject when parseable.',
    }),

    // ── Source ───────────────────────────────────────────────────────────────
    defineField({
      name: 'sourceType',
      title: 'Source type',
      type: 'string',
      group: 'source',
      options: { list: [...SOURCE_TYPES], layout: 'radio' },
      initialValue: 'external',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      group: 'source',
      options: { list: [...PLATFORMS], layout: 'dropdown' },
      hidden: ({ document }) => document?.sourceType !== 'external',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.sourceType === 'external' && !value) {
            return 'Select a platform for external videos.'
          }
          return true
        }),
    }),
    defineField({
      name: 'externalUrl',
      title: 'External URL',
      type: 'url',
      group: 'source',
      description: 'Canonical watch URL (e.g. https://www.youtube.com/watch?v=…).',
      hidden: ({ document }) => document?.sourceType !== 'external',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.sourceType === 'external' && !value) {
            return 'External URL is required.'
          }
          return true
        }),
    }),
    defineField({
      name: 'videoFile',
      title: 'Video file',
      type: 'file',
      group: 'source',
      options: { accept: 'video/*' },
      hidden: ({ document }) => document?.sourceType !== 'hosted',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.sourceType === 'hosted' && !value) {
            return 'Upload a video file for hosted videos.'
          }
          return true
        }),
    }),

    // ── Publishing ───────────────────────────────────────────────────────────
    defineField({
      name: 'publishedAt',
      title: 'Published date',
      type: 'datetime',
      group: 'publishing',
      description: 'Used as uploadDate in VideoObject structured data.',
    }),
    defineField({
      name: 'channels',
      title: 'Channels',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'publishing',
      options: { list: CHANNEL_OPTIONS, layout: 'grid' },
      description:
        'Which surfaces this video can appear on. Preset to the current workspace when created in a lens; edit in Global to share a video across surfaces. Optional — untagged videos are only listed in Global.',
    }),
    defineField({
      name: 'viewCount',
      title: 'Views',
      type: 'number',
      group: 'publishing',
      description:
        'View count used to rank this video in the Popular row (higher = more prominent). Manually set or analytics-synced.',
      initialValue: 0,
      validation: (Rule) => Rule.min(0).integer(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      sourceType: 'sourceType',
      platform: 'platform',
      media: 'thumbnail',
    },
    prepare({ title, sourceType, platform, media }) {
      const source =
        sourceType === 'hosted'
          ? 'Hosted'
          : platform
            ? platform.charAt(0).toUpperCase() + platform.slice(1)
            : 'External'
      return {
        title: title || 'Untitled video',
        subtitle: source,
        media,
      }
    },
  },
  orderings: [
    {
      title: 'Published date, newest',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
})
