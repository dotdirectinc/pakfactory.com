import { defineField, defineType } from 'sanity'
import { PlayIcon } from '@sanity/icons'
import { MEDIA_TAG, taggedImageField } from '../lib/media-tags'

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
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      description:
        'Short summary for cards and VideoObject JSON-LD. Required for Google Rich Results.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published date',
      type: 'datetime',
      description: 'Used as uploadDate in VideoObject structured data.',
    }),
    defineField({
      name: 'sourceType',
      title: 'Source type',
      type: 'string',
      options: { list: [...SOURCE_TYPES], layout: 'radio' },
      initialValue: 'external',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
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
    defineField(
      taggedImageField({
        name: 'thumbnail',
        title: 'Thumbnail / poster',
        type: 'image',
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
      description: 'Display hint, e.g. "4:32". Used in VideoObject when parseable.',
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
