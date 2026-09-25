# Customizations catalog (PROD-1288)

How the filterable customizations library is wired for humans and AI agents. Binding product rules remain in [`AGENTS.md`](../../../AGENTS.md) and ADR-017; this file is **www how-built** only.

## Surfaces

| Surface | Path / type | Notes |
| --- | --- | --- |
| Route | `/customizations` → [`src/app/(site)/customizations/page.tsx`](../src/app/(site)/customizations/page.tsx) | Full page chrome; **URL sync** for filters |
| Studio singleton | `_type` / id **`customizationCatalogPage`** (Main Website → Customization Pages) | Owns `sections[]` **below** the fixed grid (PROD-2589). H1 / intro / SEO stay route fallbacks. `customizationsCatalog` is **not** allowlisted on this doc. |
| Studio section | `_type` / section name **`customizationsCatalog`** | Embeddable library on other pages; **local** filter state (`urlSync={false}`) |
| Catalogue strip (different) | **`customizationsRow`** | Curated row via `rowSectionFields` — **not** this catalog |

Renderer for the section: [`src/components/sections/customizations-catalog.tsx`](../src/components/sections/customizations-catalog.tsx) (`CustomizationsCatalogSection`).

The faceted grid on `/customizations` is **route-owned** (not a CMS section).

## Data seam (Sanity → UI)

Do **not** add a `modules/` catalog (www has no `components/modules/`). Use the F1a seam:

| Layer | Location |
| --- | --- |
| GROQ (library) | [`packages/sanity/src/queries/catalog.ts`](../../../packages/sanity/src/queries/catalog.ts) — `CATALOG_CUSTOMIZATION_LIBRARY_QUERY` |
| GROQ (page sections) | [`packages/sanity/src/queries/catalog-pages.ts`](../../../packages/sanity/src/queries/catalog-pages.ts) — `CUSTOMIZATION_CATALOG_PAGE_QUERY` |
| Mapper | [`src/lib/catalog/map-sanity.ts`](../src/lib/catalog/map-sanity.ts) — `mapSanityLibraryOption` |
| Facet assembly | [`src/lib/catalog/build-customization-library.ts`](../src/lib/catalog/build-customization-library.ts) |
| Facet engine | [`src/lib/catalog/facet-engine.ts`](../src/lib/catalog/facet-engine.ts) — `createFacetEngine` |
| Filter matching | [`src/lib/catalog/customization-catalog-filter.ts`](../src/lib/catalog/customization-catalog-filter.ts) — thin config on the engine |
| Query state | [`src/lib/catalog/use-catalog-query-state.ts`](../src/lib/catalog/use-catalog-query-state.ts) — local state + `history.replaceState` (owns `category`) |
| Progressive reveal | [`src/lib/catalog/use-progressive-reveal.ts`](../src/lib/catalog/use-progressive-reveal.ts) |
| Filter taxonomy (ops + product lines) | [`src/lib/catalog/customization-filter-taxonomy.ts`](../src/lib/catalog/customization-filter-taxonomy.ts) — driven by [`docs/customization-filter-taxonomy.md`](./customization-filter-taxonomy.md) |
| API | [`src/lib/catalog/catalog.ts`](../src/lib/catalog/catalog.ts) — **`listCustomizations()`**, **`getCustomizationCatalogPage()`** |
| Alias | `listCustomizationCategories()` → `listCustomizations().items` |
| Detail | `getCustomizationCategory(category, handle)` |
| Cache tag | `WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG` |

Library options: `customizationOption` with `hasPage == true` and `status == "active"` (D55 / PROD-2482). Configurator pickability is `configuratorRole` and is orthogonal — do not gate the library on deprecated `role == "reference"` (ADR-017 §3 before the split).

### Product availability — shared rules (PROD-2556)

What a product offers is resolved by **`@pakfactory/sanity/customization-rules`** — the same package Studio's Customization tab uses, so www and Studio cannot disagree (ADR-022). Inputs: `product.availableCustomizations` (product-decided Types), `customizationType.dependsOn` requirements + option `compatibleCustomizations` (customization-decided Types), and `product.customizationExceptions`. A preset (`kind == "inspiration"`) resolves through its `basedOn` product; its own `preselectedIds` still apply.

| Layer | Location |
| --- | --- |
| Rules GROQ | `CATALOG_CUSTOMIZATION_RULES_QUERY` + PDP `rulesProduct` in [`packages/sanity/src/queries/catalog.ts`](../../../packages/sanity/src/queries/catalog.ts) |
| Resolve per product + client snapshot | [`src/lib/catalog/customization-rules.ts`](../src/lib/catalog/customization-rules.ts) |
| Fetch / cache (`${WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG}:rules`) | `getPreparedRules()` / `resolveProductOffer()` in [`src/lib/catalog/catalog.ts`](../src/lib/catalog/catalog.ts) |
| Builder narrowing as the customer chooses | [`src/lib/customization-builder/rules-narrowing.ts`](../src/lib/customization-builder/rules-narrowing.ts) |
| Display order only | [`src/lib/catalog/customization-category-order.ts`](../src/lib/catalog/customization-category-order.ts) |

**Builder UX is unchanged:** one answer per category step. An answered category is *closed* (its other Types stop keeping options available); a step lists its own alternatives, narrowed by the other categories' answers; a chosen option another answer makes impossible is cleared silently.

**Production guard:** until a dataset holds `compatibleCustomizations` and `dependsOn` data, `prepareRules()` returns null and each product shows only what it lists directly (the rules fail closed — applying them to an empty rules dataset would remove every printing/finishing option).

**Snapshot:** each product ships a pruned rules snapshot (its resolvable options only, compact ids, symmetric pairs stored once — ~20–35 KB on dev) with the PDP and every saved request line; narrowing on it is identical to narrowing on the full catalog.

Builder rail + catalog tabs share `compareCategorySlugs()`: Dimensions → materials → printing → finishing → additional-customization. Empty categories stay hidden.

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
| `customization-catalog-panel.tsx` | `CustomizationCatalogPanel` | Client: tabs/chips, search, filters, Load more (2 auto-reveals then button), URL/local state |
| `customization-catalog-filters.tsx` | `CustomizationCatalogFilters` | Desktop left rail (`lg+`) |
| `customization-catalog-filters-drawer.tsx` | `CustomizationCatalogFiltersDrawer` | Mobile filters bottom Drawer (Clear all + Show N) |
| `customization-facet-group.tsx` | `CustomizationFacetGroup` | Checkbox rows + counts centered under the chevron column; previews 15 options with Show more / Show less; zero-count options disabled |
| `customization-catalog-list.tsx` | `CustomizationCatalogList` | Equal-height 4-col grid |
| `customization-card.tsx` | `CustomizationCard` | Tile |

Buyer copy: **customization**, never “capability”.

## Filter / URL responsibility

- **Server:** one library fetch + facet catalog in `CustomizationLibraryResult`; page sections via cached `getCustomizationCatalogPage()`. The route does **not** read `searchParams` — the client owns `category`.
- **Client:** local state is the source of truth; `history.replaceState` mirrors `category`, `q`, and facet params (no `router.replace`, no RSC round trip on filter clicks — PROD-2599). Back/forward re-seeds from `useSearchParams`.
- **Filter:** in memory via the shared facet engine; facet option counts are **disjunctive (except-self)**; header **“N of M”** stays based on the fully filtered result set; category tab counts use the same search + facet selections as the grid; Load more pagination (auto-reveal two `PAGE_SIZE` batches via IntersectionObserver, then manual button; no artificial append delay)
- **Route:** `urlSync` (default true) — `category`, `q`, plus facet ids as comma-separated query params (load-more depth is session-only, not in the URL)

- **Section:** `urlSync={false}` — local React state only; optional `initialCategory` from Studio
- **Facet combine:** across facet groups = **AND**; within Sustainability and Performance = **AND**; within Product Line and other properties = **OR** (see [`customization-filter-taxonomy.md`](./customization-filter-taxonomy.md))
- **UI chrome:** underline category tabs + pill search on `lg+`; below `lg`, sticky search + Filters button, horizontal category chips, and facet groups in a bottom **Drawer** (Clear all + Show N); accordion facet groups (mockup-aligned); each facet group previews **15** options then **Show more** / **Show less** (auto-expands if a selected value is past the fold); option counts share a trailing column centered under the chevron; options with live count **0** are disabled (still uncheckable if already selected)

## Out of scope (this ticket)

- Mid-page CTA band
- Detail body (PROD-1299)
- Making the `(site)` layout cacheable (PROD-2599 L4 follow-up)
- Bookmark/compare persistence
- Changing `customizationsRow` strip behavior
- Canonical facet option lists beyond what Sanity content provides
