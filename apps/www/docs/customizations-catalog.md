# Customizations catalog (PROD-1288)

How the filterable customizations library is wired for humans and AI agents. Binding product rules remain in [`AGENTS.md`](../../../AGENTS.md) and ADR-017; this file is **www how-built** only.

## Surfaces

| Surface | Path / type | Notes |
| --- | --- | --- |
| Route | `/customizations` → [`src/app/(site)/customizations/page.tsx`](../src/app/(site)/customizations/page.tsx) | Full page chrome; **URL sync** for filters |
| Studio section | `_type` / section name **`customizationsCatalog`** | Embeddable library; **local** filter state (`urlSync={false}`) |
| Catalogue strip (different) | **`customizationsRow`** | Curated row via `rowSectionFields` — **not** this catalog |

Renderer for the section: [`src/components/sections/customizations-catalog.tsx`](../src/components/sections/customizations-catalog.tsx) (`CustomizationsCatalogSection`).

## Data seam (Sanity → UI)

Do **not** add `modules/catalog`. Use the F1a seam:

| Layer | Location |
| --- | --- |
| GROQ | [`packages/sanity/src/queries/catalog.ts`](../../../packages/sanity/src/queries/catalog.ts) — `CATALOG_CUSTOMIZATION_LIBRARY_QUERY` |
| Mapper | [`src/lib/catalog/map-sanity.ts`](../src/lib/catalog/map-sanity.ts) — `mapSanityLibraryOption` |
| Facet assembly | [`src/lib/catalog/build-customization-library.ts`](../src/lib/catalog/build-customization-library.ts) |
| Filter matching | [`src/lib/catalog/customization-catalog-filter.ts`](../src/lib/catalog/customization-catalog-filter.ts) — `matchesCustomizationItem`, `buildCustomizationFacetCounts` |
| Filter taxonomy (ops + product lines) | [`src/lib/catalog/customization-filter-taxonomy.ts`](../src/lib/catalog/customization-filter-taxonomy.ts) — driven by [`docs/customization-filter-taxonomy.md`](./customization-filter-taxonomy.md) |
| API | [`src/lib/catalog/catalog.ts`](../src/lib/catalog/catalog.ts) — **`listCustomizations()`** (ticket name `getCustomizations`) |
| Alias | `listCustomizationCategories()` → `listCustomizations().items` |
| Detail | `getCustomizationCategory(category, handle)` |
| Cache tag | `WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG` |

Library options: `customizationOption` with `hasPage == true` and `status == "active"` (D55 / PROD-2482). Configurator pickability is `configuratorRole` and is orthogonal — do not gate the library on deprecated `role == "reference"` (ADR-017 §3 before the split).

### Product offer vs derived categories (PROD-2529)

Studio authors **only** product-dictated categories on `product.availableCustomizations` (`materials`, `additional-customization`). Finishing / Printing are **derived** on www from Option `worksOnCustomizations` / `incompatibleWithCustomizations`.

| Layer | Location |
| --- | --- |
| Category policy (`product` \| `derived` \| `code`) | [`src/lib/catalog/customization-category-policy.ts`](../src/lib/catalog/customization-category-policy.ts) |
| Resolve / expand / filter | [`src/lib/catalog/customization-availability.ts`](../src/lib/catalog/customization-availability.ts) |
| Derived universe GROQ | `CATALOG_DERIVED_CUSTOMIZATION_OPTIONS_QUERY` in [`packages/sanity/src/queries/catalog.ts`](../../../packages/sanity/src/queries/catalog.ts) |

Builder rail + catalog tabs share policy `sortIndex`: Dimensions → materials → printing → finishing → additional-customization. Empty categories stay hidden. When Studio/Category later authors availability mode, replace the policy seed — keep calling `getCategoryPolicy()` / `compareCategorySlugs()`.

### Sanity field map

| App | Sanity |
| --- | --- |
| Category tabs / `categoryValue` | `type->category` (`customizationCategory.slug` / `title`) |
| Card title / slug / media | option fields |
| Product Line facet | Reverse: products with this option in `availableCustomizations` → `productLine` (PROD-2529; retired `availableOnProducts`) |
| Sustainability + other facets | `properties[]` → `propertyValue` + parent `property` |
| Category-specific facet groups | Non-sustainability properties present on items in that category |
| Configurator pickability | `configuratorRole` (fallback deprecated `role`) |
| Type pick count | `customerSelects` (fallback deprecated `cardinality`) |

Facet URL keys use `property.slug` (and `product-line` for Product Line). Shared rail: Product Line + Sustainability (when values exist). Other properties appear when a category tab ≠ All is selected.

## Component naming

Folder: `src/components/customization/`

| File | Export | Role |
| --- | --- | --- |
| `customization-catalog-view.tsx` | `CustomizationCatalogView` | Chrome + Suspense + panel |
| `customization-catalog-panel.tsx` | `CustomizationCatalogPanel` | Client: tabs/chips, search, filters, Load more (2 auto-reveals then button; append skeletons ~400ms), URL/local state |
| `customization-catalog-filters.tsx` | `CustomizationCatalogFilters` | Desktop left rail (`lg+`) |
| `customization-catalog-filters-drawer.tsx` | `CustomizationCatalogFiltersDrawer` | Mobile filters bottom Drawer (Clear all + Show N) |
| `customization-facet-group.tsx` | `CustomizationFacetGroup` | Checkbox rows + counts centered under the chevron column; previews 15 options with Show more / Show less; zero-count options disabled |
| `customization-catalog-list.tsx` | `CustomizationCatalogList` | Equal-height 4-col grid |
| `customization-card.tsx` | `CustomizationCard` | Tile |

Buyer copy: **customization**, never “capability”.

## Filter / URL responsibility

- **Server:** one library fetch + facet catalog in `CustomizationLibraryResult`
- **Client:** filter in memory via `matchesCustomizationItem`; facet option counts via `buildCustomizationFacetCounts` — **disjunctive (except-self)**: for facet F, count options against items that match category + query + all selections **except F** (so selecting one Product Line does not zero sibling lines); header **“N of M”** stays based on the fully filtered result set; category tab counts use the same search + facet selections as the grid; Load more pagination (auto-reveal two `PAGE_SIZE` batches via IntersectionObserver, then manual button; each reveal shows append card skeletons for ~400ms before bumping `visible`)
- **Route:** `urlSync` (default true) — `category`, `q`, plus facet ids as comma-separated query params (load-more depth is session-only, not in the URL)

- **Section:** `urlSync={false}` — local React state only
- **Facet combine:** across facet groups = **AND**; within Sustainability and Performance = **AND**; within Product Line and other properties = **OR** (see [`customization-filter-taxonomy.md`](./customization-filter-taxonomy.md))
- **UI chrome:** underline category tabs + pill search on `lg+`; below `lg`, sticky search + Filters button, horizontal category chips, and facet groups in a bottom **Drawer** (Clear all + Show N); accordion facet groups (mockup-aligned); each facet group previews **15** options then **Show more** / **Show less** (auto-expands if a selected value is past the fold); option counts share a trailing column centered under the chevron; options with live count **0** are disabled (still uncheckable if already selected)

## Out of scope (this ticket)

- Mid-page CTA band
- Detail body (PROD-1299)
- Bookmark/compare persistence
- Changing `customizationsRow` strip behavior
- Canonical facet option lists beyond what Sanity content provides
