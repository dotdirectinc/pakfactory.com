/**
 * Newsroom — `pressRelease` list / detail and the two layout documents
 * (PROD-2909 model; PROD-2913 `/newsroom`, PROD-2918 `/newsroom/[slug]`).
 *
 * 🔴 Go-live gate: every query filters `publishedAt <= now()`. Scheduled drafts
 * and Content Releases are off in this Studio (PROD-2228), so a future-dated
 * release is published content that must stay off the site until its hour —
 * the gate here is the only thing enforcing that.
 *
 * Layouts: `newsroomCatalogPage` is read by its fixed id. `newsroomDetailPage`
 * resolves through the release's `template`, falling back to the Default fixed
 * id — the same contract as the catalog detail templates (`catalog-pages.ts`).
 */

import {
  PRESS_RELEASE_CARD_FIELDS,
  PRESS_RELEASE_LIVE,
  PRESS_RELEASE_REF_LIVE,
  type PressReleaseCardDoc,
  type PressReleaseCategory,
} from './press-release-card'
import {
  PAGE_SECTIONS_PROJECTION,
  type PageSectionDoc,
} from './sections'

/** Body blocks: inline images carry alt + watermark inputs, like case studies. */
const PRESS_RELEASE_BODY = /* groq */ `[]{
  ...,
  _type == "bodyImage" => {
    ...,
    "alt": coalesce(alt, asset.asset->altText),
    "applyWatermark": coalesce(applyWatermark, true),
    "lqip": asset.asset->metadata.lqip,
    asset
  }
}`

const NEWSROOM_LAYOUT_PROJECTION = /* groq */ `{
  _id,
  title,
  aboutText,
  mediaContactText,
  mediaContactEmail,
  "sections": sections[]${PAGE_SECTIONS_PROJECTION}
}`

/** Every live release, newest first (the listing sorts pins on top in code). */
export const PRESS_RELEASES_LIST_QUERY = /* groq */ `*[
  ${PRESS_RELEASE_LIVE}
] | order(publishedAt desc) ${PRESS_RELEASE_CARD_FIELDS}`

/** `/newsroom` layout — fixed id; `featured` pins releases to the top. */
export const NEWSROOM_CATALOG_PAGE_QUERY = /* groq */ `*[
  _id == "newsroomCatalogPage"
][0]{
  _id,
  title,
  "featured": featured[${PRESS_RELEASE_REF_LIVE}]->${PRESS_RELEASE_CARD_FIELDS},
  "sections": sections[]${PAGE_SECTIONS_PROJECTION}
}`

/** One live release by slug, with its layout (template → Default id). */
export const PRESS_RELEASE_BY_SLUG_QUERY = /* groq */ `*[
  ${PRESS_RELEASE_LIVE} && slug.current == $slug
][0]{
  _id,
  title,
  "slug": slug.current,
  summary,
  dateline,
  category,
  publishedAt,
  lastModified,
  heroMedia {
    mediaType,
    "imageUrl": image.asset->url,
    "imageHotspot": image.hotspot,
    "imageWidth": image.asset->metadata.dimensions.width,
    "imageHeight": image.asset->metadata.dimensions.height,
    "alt": coalesce(alt, image.asset->altText),
    videoUrl,
    "videoThumbnailUrl": videoThumbnail.asset->url
  },
  imageCaption,
  "body": body${PRESS_RELEASE_BODY},
  metaTitle,
  metaDescription,
  canonicalUrl,
  allowIndex,
  allowFollow,
  noImageIndex,
  ogTitle,
  ogDescription,
  "ogImageUrl": ogImage.asset->url,
  "layout": coalesce(
    template->${NEWSROOM_LAYOUT_PROJECTION},
    *[_id == "newsroomDetailPage"][0]${NEWSROOM_LAYOUT_PROJECTION}
  )
}`

/** Upper bound for {@link LATEST_PRESS_RELEASES_QUERY}; callers slice to the row's `count`. */
export const LATEST_PRESS_RELEASES_MAX = 12

/**
 * "More announcements" fallback for an empty `pressReleasesRow`: the latest
 * live releases, excluding the one being read (`$excludeId`, `""` on the
 * listing). Same contract as `post.relatedPosts` — pins override it. The slice
 * is a literal (groq-js rejects parameters there); callers trim to `count`.
 */
export const LATEST_PRESS_RELEASES_QUERY = /* groq */ `*[
  ${PRESS_RELEASE_LIVE} && _id != $excludeId
] | order(publishedAt desc)[0...${LATEST_PRESS_RELEASES_MAX}] ${PRESS_RELEASE_CARD_FIELDS}`

/**
 * How many live releases exist besides the one being read (`$excludeId`) — a
 * `pressReleasesRow` shows "See all announcements" only when this is more than
 * it lists.
 */
export const PRESS_RELEASE_OTHERS_COUNT_QUERY = /* groq */ `count(*[
  ${PRESS_RELEASE_LIVE} && _id != $excludeId
])`

/** Slugs for `generateStaticParams`. */
export const PRESS_RELEASE_SLUGS_QUERY = /* groq */ `*[
  ${PRESS_RELEASE_LIVE}
]{ "slug": slug.current }`

/** Slugs + lastmod for the sitemap. */
export const PRESS_RELEASE_SITEMAP_QUERY = /* groq */ `*[
  ${PRESS_RELEASE_LIVE}
] | order(publishedAt desc){
  "slug": slug.current,
  "lastmod": coalesce(lastModified, publishedAt, _updatedAt)
}`

/**
 * Release publisher (NewsArticle JSON-LD) — Global Settings → Company →
 * Organization. The About / Media contact copy is on the Newsroom Detail Page
 * template instead (PROD-2918 review). Kept apart from the global-settings
 * query so the newsroom does not widen the payload every www page loads.
 */
export const NEWSROOM_PRESS_SETTINGS_QUERY = /* groq */ `*[_type == "settings"][0]{
  "companyName": organization.legalName,
  "logoUrl": organization.logo.asset->url
}`

// ─── Result types ─────────────────────────────────────────────────────────────

export {PRESS_RELEASE_CARD_FIELDS, PRESS_RELEASE_LIVE}
export type {PressReleaseCardDoc, PressReleaseCategory}
export type {PressReleaseCardImageDoc} from './press-release-card'

export type NewsroomCatalogPageDoc = {
  _id: string
  title?: string | null
  /** Live pins, in editor order. */
  featured?: PressReleaseCardDoc[] | null
  sections?: PageSectionDoc[] | null
}

export type NewsroomLayoutDoc = {
  _id: string
  title?: string | null
  /** "About PakFactory" copy (Portable Text); empty → the standard copy. */
  aboutText?: unknown[] | null
  mediaContactText?: string | null
  mediaContactEmail?: string | null
  sections?: PageSectionDoc[] | null
}

export type PressReleaseDetailDoc = {
  _id: string
  title?: string | null
  slug?: string | null
  summary?: string | null
  dateline?: string | null
  category?: PressReleaseCategory | string | null
  publishedAt?: string | null
  lastModified?: string | null
  heroMedia?: {
    mediaType?: 'image' | 'video' | string | null
    imageUrl?: string | null
    imageHotspot?: {x?: number | null; y?: number | null} | null
    imageWidth?: number | null
    imageHeight?: number | null
    alt?: string | null
    videoUrl?: string | null
    videoThumbnailUrl?: string | null
  } | null
  imageCaption?: string | null
  body?: unknown[] | null
  metaTitle?: string | null
  metaDescription?: string | null
  canonicalUrl?: string | null
  allowIndex?: boolean | null
  allowFollow?: boolean | null
  noImageIndex?: boolean | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImageUrl?: string | null
  layout?: NewsroomLayoutDoc | null
}

export type PressReleaseSlugDoc = {slug: string}

export type PressReleaseSitemapEntry = {
  slug: string
  lastmod?: string | null
}

export type NewsroomPressSettingsDoc = {
  companyName?: string | null
  logoUrl?: string | null
}
