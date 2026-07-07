import { PlayIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, taggedImageType } from '../../lib/media-tags'

/**
 * bodyVideo — inline video embed for the post Portable Text body.
 *
 * One-off content authored in place. Takes a YouTube or Vimeo URL and an
 * optional poster image; the frontend shows a click-to-play poster that loads
 * the provider iframe on demand (privacy-friendly, no third-party requests
 * until play). Register in `schemas/inline/index.ts` to auto-join the post body.
 */
export const bodyVideo = defineType({
  name: 'bodyVideo',
  title: 'Video embed',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'Video URL',
      type: 'url',
      description:
        'Full video/post URL — YouTube, Vimeo, Dailymotion, TikTok, Facebook, X (Twitter), or Instagram.',
      validation: (Rule) =>
        Rule.required().uri({ scheme: ['https', 'http'] }).error('Enter a full video URL.'),
    }),
    defineField({
      name: 'poster',
      title: 'Poster image',
      ...taggedImageType([MEDIA_TAG.blog], { hotspot: true }),
      description:
        'Optional custom thumbnail — overrides the platform thumbnail. YouTube/Vimeo/Dailymotion/TikTok auto-fetch one; Facebook and X/Instagram have none, so a poster is recommended there.',
    }),
    defineField({
      name: 'title',
      title: 'Accessible title',
      type: 'string',
      description: 'Describes the video for screen readers (play button + iframe title).',
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description: 'Optional caption shown below the video.',
    }),
  ],
  preview: {
    select: { url: 'url', caption: 'caption', media: 'poster' },
    prepare({ url, caption, media }) {
      return { title: caption || 'Video embed', subtitle: url, media }
    },
  },
})
