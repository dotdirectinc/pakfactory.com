# Products catalog (PROD-1845)

How the filterable products library is wired for humans and AI agents. Binding product rules remain in [`AGENTS.md`](../../../AGENTS.md); this file is **www how-built** only.

## Surfaces

| Surface | Path / type | Notes |
| --- | --- | --- |
| Route | `/products` → [`src/app/(site)/products/page.tsx`](../src/app/(site)/products/page.tsx) | Full page chrome; **URL sync** for filters |
| Studio singleton | `_type` / id **`productCatalogPage`** (Main Website → Product Pages) | Owns `sections[]` **below** the fixed grid (PROD-2589). H1 / intro / SEO stay route fallbacks. |
| Line landing | `/products/[slug]` | `ProductLineLanding` |
| Style landing | `/products/[slug]/[styleSlug]` → [`product-style-view.tsx`](../src/components/product/product-style-view.tsx) | Heading + media + scoped `ProductCatalogView` (same shape as solution style). Studio singleton **`productStylePage`** owns `sections[]` below the grid. |

**No Categories panel** — unlike `/customizations`, there are no category tabs, no `category` URL param, and no category-dependent facets.

The faceted grid is **route-owned** (not a CMS section). Do not put a products library into `sections[]` on this singleton.

## Data seam (Sanity → UI)

Do **not** add a `modules/` catalog (www has no `components/modules/`). Use the F1a seam:

| Layer | Location |
| --- | --- |
| GROQ (library) | [`packages/sanity/src/queries/catalog.ts`](../../../packages/sanity/src/queries/catalog.ts) — `CATALOG_PRODUCT_LIBRARY_QUERY` |
| GROQ (page sections) | [`packages/sanity/src/queries/catalog-pages.ts`](../../../packages/sanity/src/queries/catalog-pages.ts) — `PRODUCT_CATALOG_PAGE_QUERY` |
| Mapper | [`src/lib/catalog/map-sanity.ts`](../src/lib/catalog/map-sanity.ts) — `mapSanityProductLibraryItem` |
| Facet assembly | [`src/lib/catalog/build-product-library.ts`](../src/lib/catalog/build-product-library.ts) |
| Facet engine | [`src/lib/catalog/facet-engine.ts`](../src/lib/catalog/facet-engine.ts) — `createFacetEngine` |
| Filter matching | [`src/lib/catalog/product-catalog-filter.ts`](../src/lib/catalog/product-catalog-filter.ts) — thin config on the engine |
| Query state | [`src/lib/catalog/use-catalog-query-state.ts`](../src/lib/catalog/use-catalog-query-state.ts) — local state + `history.replaceState` |
| Progressive reveal | [`src/lib/catalog/use-progressive-reveal.ts`](../src/lib/catalog/use-progressive-reveal.ts) |
| API | [`src/lib/catalog/catalog.ts`](../src/lib/catalog/catalog.ts) — **`listProductLibrary()`**, **`getProductCatalogPage()`** |
| Cache tag | `WWW_CATALOG_PRODUCTS_CACHE_TAG` |

Active products only (`status == "active"` or unset), ordered by title.

### What is shown (PROD-2845)

One `status` field decides whether a catalog document gets a page, a listing, and a nav link. Shared GROQ constants live in [`status-gates.ts`](../../../packages/sanity/src/queries/status-gates.ts) (re-exported by `catalog.ts` and `@pakfactory/sanity/queries`); TS mirrors for chrome / mapping live in [`@pakfactory/sanity/catalog-visibility`](../../../packages/sanity/src/catalog-visibility.ts) (`isCatalogTargetVisible`). Do not re-write the whitelist in www.

| Rule | Condition | Meaning |
| --- | --- | --- |
| `LISTED_STATUS` | unset, `active`, `coming-soon` | **Products** (and bundles / expertise stages): `coming-soon` still lists with a badge; `discontinued` keeps its page ("no longer available") but is not listed. `not-active` and `active-internal` fall out of the whitelist. |
| `HAS_PAGE_STATUS` | unset, `active`, `coming-soon`, `discontinued` | Product **detail** routes. |
| `LINE_STYLE_LISTED` | unset, `active`, `active-internal` | Lines/styles as **filters**. `active-internal` has no page but still labels products (R4). |
| `LINE_STYLE_HAS_PAGE` | unset, `active`, `discontinued` | Line/style **routes**. Discontinued keeps the URL for search. |
| `LINE_STYLE_ACTIVE` | unset or `active` | A **link** to a line (hero, facet). |
| `SOLUTION_ACTIVE` | `status == "active"` | Solution pages, Finder industries, catalog CTAs. Unset is hidden (replaced `hasPage`, which defaulted to false). |

| `_type` | Chrome (`isCatalogTargetVisible`) |
| --- | --- |
| `productLine`, `productStyle` | `LINE_STYLE_ACTIVE` |
| `product`, `bundle` | `LISTED_STATUS` |
| `customizationOption` | page-bearing `appearsIn` + `active` |
| `expertiseService` | `hasPage` + listed (still its own boolean) |
| `expertiseStage` | listed |
| `solution` | `SOLUTION_ACTIVE` |

Also applied to: the option → product-lines facet, the three solution product lists, the Solution Style filter, the Algolia product index and the case-studies Products filter. Behaviour tests: [`line-style-visibility.test.ts`](../../../packages/sanity/src/queries/line-style-visibility.test.ts).

### Parents, primary and FAQs (2026-10-06, PROD-2898 · content-model D80)

A product's own status is not the whole answer. **Use the product gates — `PRODUCT_LISTED` / `PRODUCT_HAS_PAGE` / `PRODUCT_ORDERABLE` — never the bare status gates, on products.** They add:

| Rule | What it does | Constant |
| --- | --- | --- |
| **Every parent off → hidden** | A product's parents are its styles (standard) or solutions (inspiration). Off = Coming soon / Not active for a style (Discontinued and Active (Internal) stay on); anything but Active for a solution. One parent is just the smallest case of "every". | `PRODUCT_HAS_PARENT_ON` |
| **R1 — exclusive parent** | A standard product follows its one line (Coming soon / Not active hide it; Discontinued keeps the page but unlists it and projects `status: discontinued`). Options follow their type and category. | `PRODUCT_LINE_OPEN` / `_HAS_PAGE`, `OPTION_ACTIVE` |
| **A preset follows its base** | An inspiration product is hidden unless its `basedOn` product **and** that product's line are Active or Active (Internal). | `INSPIRATION_BASE_OPEN` (inside `PRODUCT_LINE_*`) |
| **The primary is fixed** | `productStyle[0]` / `solutions[0]` is never substituted by the next parent. An off primary still shows in the PDP breadcrumb, as text (`breadcrumbLinks`). The inspiration breadcrumb parent is `solutions[0]`; the first-industry value lives on as `industry` (grouping, Related Products). | `breadcrumbLinks` |
| **FAQ inheritance** | Own FAQs win. Standard: primary style (only while on and non-empty) → line → none. Inspiration: primary solution (only while Active) → none. | `PRODUCT_FAQS_INHERITED` |

Also gated, so a hidden target is never shown or linked:
- **Curated picks** — `relatedProducts`, `featuredProducts`, products rows, inspirations / product-styles cards (`CURATED_REF_VISIBLE` in `sections.ts`).
- **Curated chrome links** — nav, hero slides, finder rail, catalog rows carry `parentsOn` (`LINK_PARENTS_ON`); `isCatalogTargetVisible` returns false when it is false. Case-study chips keep their label and link only when `linkable`.
- **Solution Styles** read their own status (`SOLUTION_STYLE_ACTIVE`), not just their solution's.
- **Style pages** exist only for Active / Discontinued styles (`hasPage` on style projections; Active (Internal) styles stay catalog filters).
- **Algolia admin search** indexes with the same gates; the `algolia-content-sync` Function removes a record when `indexable` turns false. A *parent's* status change fires no event for its children — those catch up on the next backfill.

Tests: `product-faqs.test.ts`, `exclusive-parent.test.ts`, `curated-visibility.test.ts`, `link-parents.test.ts`, `style-page.test.ts`, `algolia/content-indexes.test.ts` (packages/sanity).

### Product kind by surface

`product.kind` is `standard` | `inspiration`. Surfaces gate which kind they show:

| Surface | Kind |
| --- | --- |
| Product line LP, styles row, `/products/[line]/[style]` library, line hero media | **standard** only |
| Product line Inspiration band (`inspirationProducts`) | **inspiration** only (industry rail) |
| Solution LP / line / style collections / hero product tiles | **inspiration** only |
| Global `/products` hub | Both (product-type facet) |

www helpers: [`lib/catalog/product-kind.ts`](../src/lib/catalog/product-kind.ts). GROQ fragments: [`@pakfactory/sanity/product-kind`](../../../packages/sanity/src/product-kind.ts) (`KIND_STANDARD` treats unset as standard; `KIND_INSPIRATION`).

**Line bottom-bar hero:** Embla carousel + shared [`CarouselNavButtons`](../src/components/ui/carousel-nav-buttons.tsx); card click opens [`StandardProductPreview`](../src/components/product/standard-product-preview.tsx) (unlabeled long description + Specs list). Solution / inspiration closer-look uses [`SolutionProductPreview`](../src/components/solution/solution-product-preview.tsx). Both compose props-only [`ProductPreviewShell`](../src/components/ui/product-preview-shell.tsx). Products without media use [`PRODUCT_LINE_HERO_FEATURE_PLACEHOLDER`](../src/lib/catalog/product-line-landing.ts) (`/products/hero-feature-placeholder.svg`).

**Line Inspiration band:** CMS section **`inspirationIndustry`** (Studio Solutions tab — Inspiration by industry) on the Product Line Page template / line `sections`. www host-overrides it with [`ProductLineInspirationSection`](../src/components/product/product-line-inspiration-section.tsx): left rail is curated industries (or all industries with products when empty); cards are `inspirationProducts` for the line filtered by the selected industry. Human: insert the section on the Product Line Page layout in Studio and publish (agents do not seed documents).

### Sanity field map

| App | Sanity |
| --- | --- |
| Card title / slug / SKU / media | `product` fields |
| Product Line facet | `productLine` (or `basedOn->productLine`) |
| Product type facet | `kind` (`standard` \| `inspiration`) |
| Industries facet | `solutions[]` where `solutionType == "industry"` |
| Sustainability facet | `properties[]` → property + values (when property is sustainability) |
| Product Style (nested) | `productStyles[]` membership (union); `productStyle` is primary for card display (PROD-2843) |
| Search | title, SKU, line title, all linked style titles |

Facet URL keys use `product-line`, `product-style`, `product-type`, `industry`, and `property.slug`. Shared rail: Product type (when kinds exist) + Product Line + Industries (when tagged) + Sustainability (when values exist).

**Product Style** is not a top-level accordion. When **exactly one** Product Line is checked, that line’s styles appear as indented checkboxes under the line row (desktop rail + mobile drawer). Styles combine with OR within the group; they AND with the line and every other facet. Unchecking the line, checking a second line, or Reset clears `product-style`. Styles from the wrong line in the URL are ignored.

A product may link to **more than one** Product Style (`product.productStyle[]`). Catalog membership is the **union** of every listed style (PROD-2843): the product appears under each style in the nested filter, on each style page, and in facet counts. `productStyle` (primary = `[0]`) still drives the card label, PDP breadcrumb, and inherited FAQs.

## Component naming

Folder: `src/components/product/`

| File | Export | Role |
| --- | --- | --- |
| `product-catalog-view.tsx` | `ProductCatalogView` | Chrome + Suspense + panel |
| `product-catalog-panel.tsx` | `ProductCatalogPanel` | Client: search, filters, Load more, URL/local state |
| `product-catalog-filters.tsx` | `ProductCatalogFilters` | Desktop left rail (`lg+`) |
| `product-catalog-filters-drawer.tsx` | `ProductCatalogFiltersDrawer` | Mobile filters bottom Drawer |
| `product-line-facet-group.tsx` | `ProductLineFacetGroup` | Product Line accordion + nested style checkboxes |
| `product-catalog-list.tsx` | `ProductCatalogList` | Equal-height 4-col grid of `ProductCard` (+ optional line entry) |
| `catalog-entry-card.tsx` | `CatalogEntryCard` | Solid entry tile → `/products/[line]` |
| `product-line-inspiration-section.tsx` | `ProductLineInspirationSection` | CMS `inspirationIndustry` host UI (industry rail + cards) |
| `standard-product-preview.tsx` | `StandardProductPreview` | Standard hero quick view (long description + Specs list) |
| `ui/catalog-facet-group.tsx` | `CatalogFacetGroup` | Shared checkbox facet accordion |

## Catalog entry card (first spot)

When **exactly one** Product Line facet value is selected:

- Insert one solid [`CatalogEntryCard`](../src/components/product/catalog-entry-card.tsx) at grid index **0** (first item)
- Card links to `productHref(lineSlug)` → `/products/[line-slug]` (line landing)
- Line meta (`description`, `cardImage`) comes from `ProductLibraryResult.linesBySlug`
- Product Line rail stays **checkbox filter only** — it does not navigate
- “N of M” counts **products only** (entry card does not inflate the total)

When zero or multiple Product Lines are selected, the entry card is omitted.

## Filter / URL responsibility

- **Server:** one library fetch + shared facet catalog in `ProductLibraryResult`; page sections via cached `getProductCatalogPage()`
- **Client:** local state is the source of truth; `history.replaceState` mirrors `q` and facet params (no `router.replace`, no RSC round trip on filter clicks — PROD-2599). State starts at the default (unfiltered) view, so the grid is **server-rendered** on the static page — first page of cards in the HTML (PROD-2799). URL params are applied right after hydration by `SearchParamsListener` ([`search-params-listener.tsx`](../src/lib/catalog/search-params-listener.tsx)), which isolates `useSearchParams` in its own `<Suspense fallback={null}>` so only that empty listener skips server rendering. It also re-applies the URL on back/forward and same-page navigation. A deep link with filters briefly shows the default view before filtering.
- **Filter:** in memory via the shared facet engine; facet option counts are **disjunctive (except-self)**; header **“N of M”** stays based on the fully filtered result set; Load more pagination (auto-reveal two `PAGE_SIZE` batches via IntersectionObserver, then manual button; no artificial append delay)
- **Route:** `urlSync` (default true) — `q` plus facet ids as comma-separated query params (no `category`; load-more depth is session-only)
- **Section deep links:** Prefer Site path `/products` + freeform `link.query` (e.g. `industry=%slug%` on a Solution LP) — see [ADR-020](../../../docs/adr/0020-component-to-section-playbook.md) § Section link → catalog query
- **Payload:** library `productStyle` (primary) and `productStyles[]` (membership) are `{slug, title}` only; `propertyTitles` are hoisted onto `ProductLibraryResult`
- **Wire format (PROD-2757):** `ProductCatalogView` (server) passes `packProductLibrary(library)` to the panel, and `ProductCatalogPanel` calls `unpackProductLibrary` once. Code past that point sees normal `ProductLibraryItem`s. The packed form:
  - Products are positional tuples.
  - Lines, styles and industries are index tables.
  - `imageAlt` is dropped when it equals the title.
  - Multi-style membership packs a trailing `styleIndexes` array when it differs from the primary alone (PROD-2843).
  - Staging (1,236 products): RSC payload 679 → 342 KB, HTML 971 → 571 KB.
  - See `lib/catalog/library-wire.ts`, plus its round-trip test. **Add new item fields to the pack/unpack pair**, or they will not reach the client.

- **Facet combine:** across facet groups = **AND**; within Sustainability and Performance = **AND**; within Product Line, Product Style, Product type, Industries, and other properties = **OR** (same taxonomy as customizations)
- **Zero-count options:** disabled in the rail (still uncheckable if already selected)

## Out of scope (this ticket)

- Category tabs / Categories left panel
- Sort control
- Studio embed section
- Mid-page CTA band
- Bookmark/compare persistence
- Making the `(site)` layout cacheable (PROD-2599 L4 follow-up)
