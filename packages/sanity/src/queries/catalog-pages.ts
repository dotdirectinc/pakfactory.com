/**
 * Product / Customization / Solution catalog index & detail-template singletons
 * (PROD-2589 / PROD-2607). Title is Studio-only; sections render below the
 * route-owned chrome/grid (or merge as a PDP template).
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

export const PRODUCT_DETAIL_PAGE_QUERY = /* groq */ `*[
  _id == "productDetailPage"
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

export const CUSTOMIZATION_DETAIL_PAGE_QUERY = /* groq */ `*[
  _id == "customizationDetailPage"
][0]{
  _id,
  _type,
  title,
  "sections": sections[]${PAGE_SECTIONS_PROJECTION}
}`

export const SOLUTION_STYLE_PAGE_QUERY = /* groq */ `*[
  _id == "solutionStylePage"
][0]{
  _id,
  _type,
  title,
  "sections": sections[]${PAGE_SECTIONS_PROJECTION}
}`
