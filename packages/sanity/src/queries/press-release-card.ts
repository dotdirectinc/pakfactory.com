/**
 * Press release card projection — shared by the newsroom queries and the
 * `pressReleasesRow` section projection. Its own module so `sections.ts` and
 * `newsroom.ts` can both import it without importing each other.
 */

import {READING_TIME_MINUTES_PROJECTION} from './blog'

/**
 * Card image — the feature image, or the video thumbnail override in video
 * mode. There is no separate card image on `pressRelease`; the hotspot is
 * projected so the card can keep the focal point inside its crop.
 */
const PRESS_RELEASE_CARD_IMAGE = /* groq */ `select(
  heroMedia.mediaType == "video" => {
    "url": heroMedia.videoThumbnail.asset->url,
    "hotspot": heroMedia.videoThumbnail.hotspot,
    "alt": heroMedia.videoThumbnail.asset->altText
  },
  {
    "url": heroMedia.image.asset->url,
    "hotspot": heroMedia.image.hotspot,
    "alt": coalesce(heroMedia.alt, heroMedia.image.asset->altText)
  }
)`

/** Published, slugged, and past its release time (PROD-2228 gate). */
export const PRESS_RELEASE_LIVE = /* groq */ `_type == "pressRelease" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()`

/** Same gate applied to a reference (`curatedItems[${…}]->`), so pins obey it too. */
export const PRESS_RELEASE_REF_LIVE = /* groq */ `@->_type == "pressRelease" && defined(@->slug.current) && defined(@->publishedAt) && @->publishedAt <= now()`

export const PRESS_RELEASE_CARD_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  summary,
  category,
  publishedAt,
  "videoUrl": select(heroMedia.mediaType == "video" => heroMedia.videoUrl),
  "image": ${PRESS_RELEASE_CARD_IMAGE},
  ${READING_TIME_MINUTES_PROJECTION}
}`

export type PressReleaseCategory =
  | 'partnership'
  | 'product'
  | 'award'
  | 'leadership'
  | 'sustainability'
  | 'milestone'
  | 'facility'

export type PressReleaseCardImageDoc = {
  url?: string | null
  hotspot?: {x?: number | null; y?: number | null} | null
  alt?: string | null
}

export type PressReleaseCardDoc = {
  _id: string
  title?: string | null
  slug?: string | null
  summary?: string | null
  category?: PressReleaseCategory | string | null
  publishedAt?: string | null
  videoUrl?: string | null
  image?: PressReleaseCardImageDoc | null
  readingTimeMinutes?: number | null
}
