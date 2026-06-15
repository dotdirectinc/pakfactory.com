import { AutoTagInput, mediaField } from 'sanity-plugin-media'
import type { ImageDefinition } from 'sanity'

export const MEDIA_TAG = {
  blog: 'blog',
  website: 'website',
  product: 'product',
  capability: 'capability',
  solution: 'solution',
  ogSocial: 'og-social',
} as const

export type MediaTag = (typeof MEDIA_TAG)[keyof typeof MEDIA_TAG]

/** Document-level image field — wraps mediaField */
export function taggedImageField(config: Parameters<typeof mediaField>[0]) {
  return mediaField(config)
}

/** Array member or inline PT image — AutoTagInput + browser pre-filter */
export function taggedImageType(
  mediaTags: MediaTag[],
  options?: ImageDefinition['options'],
) {
  return {
    type: 'image' as const,
    options: { ...options, mediaTags },
    components: { input: AutoTagInput },
  }
}

/** Convenience for OG fields */
export function ogMediaTags(channel: MediaTag): MediaTag[] {
  return [channel, MEDIA_TAG.ogSocial]
}
