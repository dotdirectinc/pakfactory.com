import { OPTION_ACTIVE } from "./status-gates";

/**
 * Titles of the options an INSPIRATION product arrives with — its pre-selections,
 * `availableCustomizations[preselected == true]`, Active options only (PROD-3296).
 * Search matches on these so "ribbon" finds the presets built with a ribbon.
 *
 * Never a standard product's list: on a standard product that list is what it is
 * merely compatible with (and a stray `preselected` flag there is inert — Studio
 * warns), which would match nearly everything. Empty array otherwise.
 *
 * Evaluated inside a projection of the product (`^` is the product), so the one
 * fragment serves the www search index (`algolia/site-search.ts`) and the `/products`
 * catalog library (`CATALOG_PRODUCT_LIBRARY_FIELDS`) — the two cannot disagree.
 * An option has an option detail page or not; either way its title counts.
 */
export const PRECONFIGURED_OPTION_TITLES = /* groq */ `select(
    _type == "product" && kind == "inspiration" => *[
      _type == "customizationOption" &&
      _id in ^.availableCustomizations[preselected == true].customization._ref &&
      !(_id in path("drafts.**")) &&
      ${OPTION_ACTIVE}
    ] | order(title asc).title,
    []
  )`;
