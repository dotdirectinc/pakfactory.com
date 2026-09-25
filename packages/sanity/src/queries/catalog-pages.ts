/**
 * Product / Customization catalog index singletons (PROD-2589).
 * Title is Studio-only; sections render below the route-owned faceted grid.
 */

import {
  PAGE_SECTIONS_PROJECTION,
  type PageSectionDoc,
} from './sections'

export type CatalogIndexPageDoc = {
  _id: string
  _type: string
  title?: string | null
  sections?: PageSectionDoc[] | null
}

export const PRODUCT_CATALOG_PAGE_QUERY = /* groq */ `*[
  _id == "productCatalogPage"
][0]{
  _id,
  _type,
  title,
  "sections": sections[]${PAGE_SECTIONS_PROJECTION}
}`

export const PRODUCT_STYLE_PAGE_QUERY = /* groq */ `*[
  _id == "productStylePage"
][0]{
  _id,
  _type,
  title,
  "sections": sections[]${PAGE_SECTIONS_PROJECTION}
}`

export const CUSTOMIZATION_CATALOG_PAGE_QUERY = /* groq */ `*[
  _id == "customizationCatalogPage"
][0]{
  _id,
  _type,
  title,
  "sections": sections[]${PAGE_SECTIONS_PROJECTION}
}`
