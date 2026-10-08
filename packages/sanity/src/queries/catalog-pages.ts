/**
 * Product / Customization / Solution catalog index & detail-template layouts
 * (PROD-2589 / PROD-2607). Title is Studio-only; sections render below the
 * route-owned chrome/grid (or merge as a PDP template).
 *
 * Entity-picked types (`productStylePage`, `solutionStylePage`,
 * `customizationDetailPage`, `productDetailPage`) resolve via the entity’s
 * `template` with fallback to the seeded Default fixed id. Catalog hubs keep
 * fixed-id fetches only.
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

const CATALOG_INDEX_PAGE_PROJECTION = /* groq */ `{
  _id,
  _type,
  title,
  "sections": sections[]${PAGE_SECTIONS_PROJECTION}
}`

export const PRODUCT_CATALOG_PAGE_QUERY = /* groq */ `*[
  _id == "productCatalogPage"
][0]${CATALOG_INDEX_PAGE_PROJECTION}`

/** Default Product Style Page layout (fallback when a style has no template). */
export const PRODUCT_STYLE_PAGE_QUERY = /* groq */ `*[
  _id == "productStylePage"
][0]${CATALOG_INDEX_PAGE_PROJECTION}`

/**
 * Prefer the style’s selected Product Style Page layout; fall back to Default id.
 */
export const PRODUCT_STYLE_PAGE_FOR_STYLE_QUERY = /* groq */ `coalesce(
  *[_type == "productStyle" && productLine->slug.current == $lineSlug && slug.current == $styleSlug][0].template->${CATALOG_INDEX_PAGE_PROJECTION},
  *[_id == "productStylePage"][0]${CATALOG_INDEX_PAGE_PROJECTION}
)`

/** Default Product Detail Page layout (fallback when a product has no template). */
export const PRODUCT_DETAIL_PAGE_QUERY = /* groq */ `*[
  _id == "productDetailPage"
][0]${CATALOG_INDEX_PAGE_PROJECTION}`

export const CUSTOMIZATION_CATALOG_PAGE_QUERY = /* groq */ `*[
  _id == "customizationCatalogPage"
][0]${CATALOG_INDEX_PAGE_PROJECTION}`

/** Default Customization Compatibility Page layout (PROD-2921). */
export const CUSTOMIZATION_COMPATIBILITY_PAGE_QUERY = /* groq */ `*[
  _id == "customizationCompatibilityPage"
][0]${CATALOG_INDEX_PAGE_PROJECTION}`

/** Default Customization Detail Page layout (fallback when an option has no template). */
export const CUSTOMIZATION_DETAIL_PAGE_QUERY = /* groq */ `*[
  _id == "customizationDetailPage"
][0]${CATALOG_INDEX_PAGE_PROJECTION}`

/**
 * Prefer the option’s selected Customization Detail Page layout; fall back to Default id.
 */
export const CUSTOMIZATION_DETAIL_PAGE_FOR_OPTION_QUERY = /* groq */ `coalesce(
  *[_type == "customizationOption" && type->category->slug.current == $category && slug.current == $handle][0].template->${CATALOG_INDEX_PAGE_PROJECTION},
  *[_id == "customizationDetailPage"][0]${CATALOG_INDEX_PAGE_PROJECTION}
)`

/** Default Solution Style Page layout (fallback when a style has no template). */
export const SOLUTION_STYLE_PAGE_QUERY = /* groq */ `*[
  _id == "solutionStylePage"
][0]${CATALOG_INDEX_PAGE_PROJECTION}`

/**
 * Prefer the style’s selected Solution Style Page layout; fall back to Default id.
 */
export const SOLUTION_STYLE_PAGE_FOR_STYLE_QUERY = /* groq */ `coalesce(
  *[_type == "solutionStyle" && solution->slug.current == $solutionSlug && slug.current == $styleSlug][0].template->${CATALOG_INDEX_PAGE_PROJECTION},
  *[_id == "solutionStylePage"][0]${CATALOG_INDEX_PAGE_PROJECTION}
)`
