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

Library options: `customizationOption` with a page-bearing `appearsIn` (`configurable-with-page` or `not-configurable-with-page`) and `status == "active"` (PROD-2732 / PROD-2733). Configurator pickability is the configurable `appearsIn` values (`configurable-with-page`, `configurable-no-page`) — orthogonal to having a library page.

| Status | Display (`appearsIn`) | Configurator | Library list | Own page |
| --- | --- | --- | --- | --- |
| Active | Configurable + page | show | show | show |
| Active | Not configurable + page | never | show | show |
| Active | Configurable + no page | show | — | — |
| Not active | any | — | — | — |

### Product availability — shared rules (PROD-2556)

What a product offers is resolved by **`@pakfactory/sanity/customization-rules`** — the same package Studio's Customization tab uses, so www and Studio cannot disagree (ADR-022). Inputs: `product.availableCustomizations` (product-decided Types), `customizationType.dependsOn` requirements + option `compatibleCustomizations` (customization-decided Types), and `product.customizationExceptions`. A preset (`kind == "inspiration"`) resolves through its `basedOn` product; its own `preselectedIds` still apply.

| Layer | Location |
| --- | --- |
| Rules GROQ | `CATALOG_CUSTOMIZATION_RULES_QUERY` + PDP `rulesProduct` in [`packages/sanity/src/queries/catalog.ts`](../../../packages/sanity/src/queries/catalog.ts) |
| Resolve per product + client snapshot | [`src/lib/catalog/customization-rules.ts`](../src/lib/catalog/customization-rules.ts) |
| Fetch / cache (`${WWW_CATALOG_CUSTOMIZATIONS_CACHE_TAG}:rules`) | `getPreparedRules()` / `resolveProductOffer()` in [`src/lib/catalog/catalog.ts`](../src/lib/catalog/catalog.ts) |
| Builder narrowing as the customer chooses | [`src/lib/customization-builder/rules-narrowing.ts`](../src/lib/customization-builder/rules-narrowing.ts) |
| Display order only | [`src/lib/catalog/customization-category-order.ts`](../src/lib/catalog/customization-category-order.ts) |

**Builder picks follow `customerSelects` (ADR-017 §4b):** a category step holds picks from several Types, each Type as many options as its `customerSelects` allows — a `one` Type swaps its pick (a box has one board), a `many` Type keeps several (Embossing + Debossing). Materials are *single selection within each Type*, so a rigid box takes one Chipboard **and** one Exterior Wrap. Each Type heading says *Choose one* / *Choose any*. Clicking a pick that is not open opens its detail (Properties, note); clicking the open pick un-picks it.

**Order inside a builder step** (`buildStepsFromCatalog` in [`state.ts`](../src/lib/customization-builder/state.ts)). Category order stays the hard-coded slug list below. Within a category, two curated arrays apply, and only here — the public `/customizations` grid and the compare peer query stay `order(title asc)`.

| Level | Field | Helper | Effect |
| --- | --- | --- | --- |
| Types in the category | `customizationCategory.typeOrder` (weak refs, projected as `categoryTypeOrder`) | `orderTypesInCategory` | Pinned types in drag order, then the rest by title |
| Options in a type | `customizationType.optionOrder` (weak refs, projected as `typeOptionOrder`) | `orderOptionsInType` ([`option-order.ts`](../../../packages/sanity/src/option-order.ts)) | Pinned options in drag order, then the rest by title |

Both lists are **order only, never a gate**. An option the array does not name still renders. Empty, absent, or all-dangling `optionOrder` collapses to alphabetical (`localeCompare` on title, else `_id`). The helper sorts the unpinned tail itself, so the order those options arrived in (rules query or `availableCustomizations`) does not survive. Weak refs to deleted options are dropped. `optionOrder` validation is `Rule.unique()` with no max; `productStyle.productOrder` is capped at 12.

**Inspiration preset seed** ([`product-request-rail.tsx`](../src/components/product/product-request-rail.tsx)). The rail calls `seedFromCustomizations` only when `kind === "inspiration"` and at least one option is `preselected`. A standard product starts empty even if Studio flags are set. An inspiration's own `availableCustomizations` list **is** the preset: GROQ `preselectedIds` and the no-rules mapper mark every listed option, because editors often leave the per-row boolean unset. Options the rules add from `basedOn` are offered, and they stay off the preset seed. On a `one` Type, the first seeded option in that array wins; later options of the same Type are skipped. The seed walks `availableCustomizations` in array order, which is separate from the builder display order above.

**Narrowing:** every pick goes to `resolveWithSelections` with `lookahead`. A pick hides every option it is **not paired with** in `compatibleCustomizations` — the lists are complete for options a product offers together, Crystal's excludes included (ADR-022 decision 5, amended 2026-09-25): Soy-Based Ink hides the other By Composition inks, Soft Touch hides the Debossing options (and vice versa), Textured Embossing & Debossing goes alone, and a finish picked first hides the boards it does not work on. A `one` Type keeps listing its alternatives. Ruled-out options stay **listed but disabled** — faded to 50% with no hover or click (the design system's disabled treatment, as on the locked rail steps), titled *Not available with your current selections*. An option is selectable only if picking it clears nothing, so anything selectable stays picked; a pick that becomes impossible (preset or saved line) is cleared silently. A Type not answered yet still counts as possible.

**Production guard:** until a dataset holds `compatibleCustomizations` and `dependsOn` data, `prepareRules()` returns null and each product shows only what it lists directly (the rules fail closed — applying them to an empty rules dataset would remove every printing/finishing option).

**Snapshot:** each product ships a pruned rules snapshot (its resolvable options only, compact ids, symmetric pairs stored once — ~20–35 KB on dev) with the PDP and every saved request line; narrowing on it is identical to narrowing on the full catalog.

Builder rail + catalog tabs share `compareCategorySlugs()`: Dimensions → materials → printing → finishing → additional-customization. Empty categories stay hidden.

### Sanity field map

| App | Sanity |
| --- | --- |
| Category tabs / `categoryValue` | `type->category` (`customizationCategory.slug` / `title`) |
| Card title / slug / media | option fields |
| Option Featured image | `featuredImage` — library cards, detail poster, social fallback ([ADR-023](../../../docs/adr/0023-featured-image-and-featured-video.md)) |
| Option Featured video | `featuredVideo` (upload / CDN URL); gallery keeps Featured image as poster (PROD-2737). YouTube is stored but ambient playback keeps the still. |
| Option Media gallery | `media[]` — additional detail frames only; not the card source |
| Product Line facet | Reverse: products with this option in `availableCustomizations` → `productLine` (PROD-2529; retired `availableOnProducts`) |
| Sustainability + other facets | `properties[]` → `propertyValue` + parent `property` |
| Category-specific facet groups | Non-sustainability properties present on items in that category |
| Configurator / library / own page | `appearsIn` (PROD-2732; replaces `hasPage` + `configuratorRole`) |
| Type pick count | `customerSelects` (fallback deprecated `cardinality`) |

Facet URL keys use `property.slug` (and `product-line` for Product Line). Shared rail: Product Line + Sustainability (when values exist). Other properties appear when a category tab ≠ All is selected.

## Business rules — customization card media

Binding product rules for the library tile (`CustomizationCard`). Field roles: [ADR-023](../../../docs/adr/0023-featured-image-and-featured-video.md). Implementers: [`customization-card.tsx`](../src/components/customization/customization-card.tsx) + [`mapSanityLibraryOption`](../src/lib/catalog/map-sanity.ts).

| State | Rest | Hover (desktop `sm+`; skip mobile / `prefers-reduced-motion`) |
| --- | --- | --- |
| Featured image set + Featured video URL | Featured image | Muted loop video over poster |
| Featured image set, no video, `media.length >= 2` | Featured image | `media[1]` (second Media image) |
| Featured image set, no video, `media.length < 2` | Featured image | No change |
| No Featured image, `media.length >= 2` | `media[0]` | `media[1]` |
| No Featured image, `media.length === 1` | `media[0]` | No change |
| No images | Package placeholder | No change |

- Rest thumb is **never** “whatever is first in a flattened Featured+Media list” — Media stays a separate array so hover can target `media[1]`.
- Featured video hover requires **both** a Featured image and a playable `featuredVideoUrl` (upload/CDN; YouTube → null).
- Mobile and reduced-motion: keep the rest still (no video, no image swap).
- Rest↔hover dissolve uses the shared media dissolve utility ([`media-dissolve.ts`](../src/lib/ui/media-dissolve.ts) — `--motion-slow` opacity crossfade).

## Detail page — copy, gallery, compare

Route: `/customizations/[category]/[handle]`. Fetch: `getCustomizationDetail` → `CATALOG_CUSTOMIZATION_DETAIL_QUERY`. Mapper: `mapSanityCustomizationDetail`.

**Body copy** is the first non-empty of `shortDescription`, glossary plain text, then benefits plain text. `metaDescription` stays on the SEO field: the page, the compare blurb, and the builder boxes read the customer-facing fallbacks only. Builder cards add one more fallback after benefits: the Type's `description`.

**Gallery** (`customizationGallerySlides`): Featured image first, then `media[]`, deduped by image URL. Product PDPs do the opposite (Media first, Featured last) — see [products catalog](./products-catalog.md) § Product detail. Card thumbs still prefer Featured image, then `media[0]`, until Featured is backfilled (ADR-023).

**Compare** (`CustomizationComparison`, id `CUSTOMIZATION_COMPARISON_ID`). Same-category peers are other active options with a detail page, `order(title asc)`, excluding the current handle. Three slots: the first is the current option and is locked; the next two seed the first two peers. The third column is hidden below `md`. Swapping a column uses a title dropdown at `md+` and a bottom drawer below that. The sticky dock (`top-2`, `z-40`, under the header) appears only after the compare hero is more than half past the top of the viewport **and** the compare section still intersects the viewport. Column choices stay in local React state for that page view. Specs come from `buildCompareMatrix`; an empty matrix shows the authored-specs empty line.

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
