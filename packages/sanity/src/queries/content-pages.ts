/**
 * Content Page and Legal Page queries for www static routes (About, Contact,
 * slugged company pages, Privacy, Terms).
 *
 * Pinned Content Pages (`aboutPage`, `contactPage`) are read by `_id`. Other
 * company pages (e.g. Sustainability) are read by `slug.current`. Legal Pages
 * have no slug — the www route maps `privacy-policy` / `terms-of-service` to
 * the pinned ids `privacyPage` / `termsPage`.
 */

import {PAGE_SECTIONS_PROJECTION, type PageSectionDoc} from './sections'

/** Pinned Content Page ids that sit at fixed URLs (no slug required). */
export const CONTENT_PAGE_PINNED_IDS = [
  'aboutPage',
  'contactPage',
  'searchPage',
  'notFoundPage',
] as const

export type ContentPagePinnedId = (typeof CONTENT_PAGE_PINNED_IDS)[number]

export type ContentPageDoc = {
  _id: string
  title?: string | null
  slug?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  allowIndex?: boolean | null
  allowFollow?: boolean | null
  sections?: PageSectionDoc[] | null
}

export type LegalPageDoc = {
  _id: string
  title?: string | null
  lastUpdated?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  allowIndex?: boolean | null
  allowFollow?: boolean | null
  body?: unknown[] | null
}

export type LegalPageListItem = {
  _id: string
  title?: string | null
  lastUpdated?: string | null
}

export type ContentPageSitemapEntry = {
  slug: string
  lastmod?: string | null
}

const CONTENT_PAGE_FIELDS = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  metaTitle,
  metaDescription,
  allowIndex,
  allowFollow,
  "sections": sections[]${PAGE_SECTIONS_PROJECTION}
}`

const LEGAL_PAGE_FIELDS = /* groq */ `{
  _id,
  title,
  lastUpdated,
  metaTitle,
  metaDescription,
  allowIndex,
  allowFollow,
  body
}`

/** One pinned Content Page by semantic `_id` (e.g. `aboutPage`). */
export const CONTENT_PAGE_BY_ID_QUERY = /* groq */ `*[
  _type == "contentPage" &&
  _id == $id
][0]${CONTENT_PAGE_FIELDS}`

/**
 * A slugged Content Page. Excludes the pinned launch ids so About / Contact
 * never resolve through the catch-all `/{slug}` route.
 */
const PINNED_CONTENT_ID_FILTER =
  '!(_id in ["aboutPage", "contactPage", "searchPage", "notFoundPage"])'

export const CONTENT_PAGE_BY_SLUG_QUERY = /* groq */ `*[
  _type == "contentPage" &&
  defined(slug.current) &&
  slug.current == $slug &&
  ${PINNED_CONTENT_ID_FILTER}
][0]${CONTENT_PAGE_FIELDS}`

/** Slugs for `generateStaticParams` on `/{slug}` — pinned ids omitted. */
export const CONTENT_PAGE_SLUGS_QUERY = /* groq */ `*[
  _type == "contentPage" &&
  defined(slug.current) &&
  ${PINNED_CONTENT_ID_FILTER}
]{ "slug": slug.current }`

/** Indexable slugged content pages for the sitemap. */
export const CONTENT_PAGE_SITEMAP_QUERY = /* groq */ `*[
  _type == "contentPage" &&
  defined(slug.current) &&
  ${PINNED_CONTENT_ID_FILTER} &&
  allowIndex != false
]{
  "slug": slug.current,
  "lastmod": _updatedAt
}`

/** One Legal Page by pinned `_id` (`privacyPage` / `termsPage`). */
export const LEGAL_PAGE_BY_ID_QUERY = /* groq */ `*[
  _type == "legalPage" &&
  _id == $id
][0]${LEGAL_PAGE_FIELDS}`

/** Every Legal Page for the `/policies` index (newest revision first). */
export const LEGAL_PAGES_LIST_QUERY = /* groq */ `*[
  _type == "legalPage"
] | order(lastUpdated desc) {
  _id,
  title,
  lastUpdated
}`
