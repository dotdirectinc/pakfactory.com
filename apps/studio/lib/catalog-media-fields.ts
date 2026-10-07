import {defineArrayMember, defineField} from 'sanity'
import {AutoTagInput} from 'sanity-plugin-media'
import type {MediaTag} from './media-tags'

type CatalogMediaFieldsOptions = {
  /** Field group/tab id. */
  group?: string
  /** Media-library tags for stills. */
  mediaTags: MediaTag[]
}

type CatalogImageItem = {
  primary?: boolean
}

function primaryCount(items: CatalogImageItem[] | undefined): number {
  return (items ?? []).filter((item) => item?.primary === true).length
}

function catalogImageMember(mediaTags: MediaTag[]) {
  return defineArrayMember({
    type: 'image',
    options: {hotspot: true, mediaTags},
    components: {input: AutoTagInput},
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt text',
        type: 'string',
        description: 'Describes the image for screen readers and SEO.',
      }),
      defineField({
        name: 'primary',
        title: 'Primary',
        type: 'boolean',
        description:
          'The still that represents this list on cards, nav, and social. At most one per list.',
        initialValue: false,
      }),
    ],
    preview: {
      select: {
        alt: 'alt',
        primary: 'primary',
        media: 'asset',
      },
      prepare({
        alt,
        primary,
        media,
      }: {
        alt?: string
        primary?: boolean
        media?: unknown
      }) {
        return {
          title: alt || 'Untitled image',
          subtitle: primary ? 'Primary' : undefined,
          media,
        }
      },
    },
  })
}

/**
 * ADR-024 four media groups for catalog documents.
 * Field order: Images → Videos → Lifestyle images → Lifestyle videos.
 */
export function catalogMediaFields({
  group,
  mediaTags,
}: CatalogMediaFieldsOptions) {
  const groupOpt = group ? {group} : {}

  return [
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      ...groupOpt,
      description:
        'Product stills — front view, side view, or any angle. Mark one as Primary for cards, nav, and social.',
      of: [catalogImageMember(mediaTags)],
      validation: (Rule) => [
        Rule.custom((value) => {
          if (primaryCount(value as CatalogImageItem[] | undefined) > 1) {
            return 'Mark only one image as Primary.'
          }
          return true
        }),
        Rule.custom((value) => {
          const items = value as CatalogImageItem[] | undefined
          if ((items?.length ?? 0) > 0 && primaryCount(items) === 0) {
            return 'Mark one image as Primary for cards, nav, and social. Until then the site uses the first image.'
          }
          return true
        }).warning(),
      ],
    }),
    defineField({
      name: 'videos',
      title: 'Videos',
      type: 'array',
      ...groupOpt,
      description:
        'Product motion (box closing, and so on). Prefer VP9 WebM with alpha or H.264 MP4. YouTube is stored; ambient playback uses the thumbnail or primary still. The first playable upload or URL is the hover video.',
      of: [defineArrayMember({type: 'catalogVideo'})],
    }),
    defineField({
      name: 'lifestyleImages',
      title: 'Lifestyle images',
      type: 'array',
      ...groupOpt,
      description:
        'In-context stills. Mark one as Primary when a surface needs a single lifestyle image.',
      of: [catalogImageMember(mediaTags)],
      validation: (Rule) => [
        Rule.custom((value) => {
          if (primaryCount(value as CatalogImageItem[] | undefined) > 1) {
            return 'Mark only one image as Primary.'
          }
          return true
        }),
        Rule.custom((value) => {
          const items = value as CatalogImageItem[] | undefined
          if ((items?.length ?? 0) > 0 && primaryCount(items) === 0) {
            return 'Mark one image as Primary when a surface needs a single lifestyle image. Until then the site uses the first image.'
          }
          return true
        }).warning(),
      ],
    }),
    defineField({
      name: 'lifestyleVideos',
      title: 'Lifestyle videos',
      type: 'array',
      ...groupOpt,
      description:
        'In-context motion. Each item needs a thumbnail for the poster.',
      of: [defineArrayMember({type: 'catalogVideo'})],
    }),
  ]
}
