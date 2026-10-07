import {PlayIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * catalogVideo — product or lifestyle motion with thumbnail (ADR-024).
 *
 * Same source choices as `featuredVideo` (upload | S3/CDN URL | YouTube) plus a
 * still thumbnail for posters. Ambient / hover playback resolves from upload or
 * a direct file URL only; YouTube is stored but front-ends keep the still.
 *
 * Thumbnail media-library tags are applied by the host field helper
 * (`catalogMediaFields`) via array-member overrides where needed; the type
 * itself stays tag-agnostic so Product, Option, and Solution share one object.
 */
export const catalogVideo = defineType({
  name: 'catalogVideo',
  title: 'Catalog video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      options: {
        list: [
          {title: 'Upload', value: 'upload'},
          {title: 'URL (S3 / CDN)', value: 'url'},
          {title: 'YouTube', value: 'youtube'},
        ],
        layout: 'radio',
      },
      initialValue: 'upload',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'file',
      title: 'Video file',
      type: 'file',
      options: {accept: 'video/mp4,video/webm,video/quicktime'},
      description:
        'Prefer VP9 WebM with alpha for transparent hover loops (Chrome/Firefox), or H.264 MP4 for widest support without alpha. ProRes / editing MOV files will not play in browsers.',
      hidden: ({parent}) => parent?.source !== 'upload',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const source = (context.parent as {source?: string} | undefined)?.source
          if (source === 'upload' && !value) {
            return 'Upload a video file, or change the source.'
          }
          return true
        }),
    }),
    defineField({
      name: 'url',
      title: 'Video URL',
      type: 'url',
      description:
        'Direct link to an MP4 or WebM on a public S3 or CDN (MOV only if already web-encoded). Not a webpage.',
      hidden: ({parent}) => parent?.source !== 'url',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const source = (context.parent as {source?: string} | undefined)?.source
          if (source === 'url' && !value) {
            return 'Enter a direct video URL, or change the source.'
          }
          return true
        }),
    }),
    defineField({
      name: 'youtubeUrl',
      title: 'YouTube URL',
      type: 'url',
      description:
        'Watch URL. Ambient boards and hover tiles use the thumbnail or primary still — use Upload or URL for a looping background.',
      hidden: ({parent}) => parent?.source !== 'youtube',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const source = (context.parent as {source?: string} | undefined)?.source
          if (source === 'youtube' && !value) {
            return 'Enter a YouTube URL, or change the source.'
          }
          return true
        }),
    }),
    defineField({
      name: 'thumbnail',
      title: 'Thumbnail',
      type: 'image',
      options: {hotspot: true},
      description: 'Poster for this video. Falls back to the primary product still when empty.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describes the image for screen readers and SEO.',
        }),
      ],
    }),
  ],
  preview: {
    select: {
      source: 'source',
      url: 'url',
      youtubeUrl: 'youtubeUrl',
      fileName: 'file.asset->originalFilename',
      media: 'thumbnail',
    },
    prepare({source, url, youtubeUrl, fileName, media}) {
      const subtitle =
        source === 'upload'
          ? fileName || 'Uploaded file'
          : source === 'url'
            ? url || 'URL'
            : youtubeUrl || 'YouTube'
      return {
        title: 'Catalog video',
        subtitle: source ? `${source}: ${subtitle}` : subtitle,
        media,
      }
    },
  },
})
