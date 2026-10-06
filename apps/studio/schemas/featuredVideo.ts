import {PlayIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * featuredVideo — shared multi-source video object (upload | S3/CDN URL | YouTube).
 *
 * Used on Product, Product Line, and Expertise Stage so editors learn one field.
 * Ambient / hover playback (`<video>`) resolves from upload or a direct file URL only
 * (H.264 MP4, VP9 WebM including alpha, or a web-encoded MOV). YouTube is stored for
 * editorial completeness but front-ends keep the still image.
 */
export const featuredVideo = defineType({
  name: 'featuredVideo',
  title: 'Featured video',
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
        'Watch URL. Ambient boards and hover tiles still use the featured/diagram image — use Upload or URL for a looping background.',
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
  ],
  preview: {
    select: {
      source: 'source',
      url: 'url',
      youtubeUrl: 'youtubeUrl',
      fileName: 'file.asset->originalFilename',
    },
    prepare({source, url, youtubeUrl, fileName}) {
      const subtitle =
        source === 'upload'
          ? fileName || 'Uploaded file'
          : source === 'url'
            ? url || 'URL'
            : youtubeUrl || 'YouTube'
      return {
        title: 'Featured video',
        subtitle: source ? `${source}: ${subtitle}` : subtitle,
      }
    },
  },
})
