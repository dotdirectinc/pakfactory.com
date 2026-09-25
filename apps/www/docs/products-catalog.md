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

### Sanity field map

| App | Sanity |
| --- | --- |
| Card title / slug / SKU / media | `product` fields |
| Product Line facet | `productLine` (or `basedOn->productLine`) |
| Product type facet | `kind` (`standard` \| `inspiration`) |
| Industries facet | `solutions[]` where `solutionType == "industry"` |
| Sustainability facet | `properties[]` → property + values (when property is sustainability) |
| Product Style (nested) | `productStyle` slug + title only on library items |
| Search | title, SKU, line title, style title |

Facet URL keys use `product-line`, `product-style`, `product-type`, `industry`, and `property.slug`. Shared rail: Product type (when kinds exist) + Product Line + Industries (when tagged) + Sustainability (when values exist).

**Product Style** is not a top-level accordion. When **exactly one** Product Line is checked, that line’s styles appear as indented checkboxes under the line row (desktop rail + mobile drawer). Styles combine with OR within the group; they AND with the line and every other facet. Unchecking the line, checking a second line, or Reset clears `product-style`. Styles from the wrong line in the URL are ignored.

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
- **Client:** local state is the source of truth; `history.replaceState` mirrors `q` and facet params (no `router.replace`, no RSC round trip on filter clicks — PROD-2599). Back/forward re-seeds from `useSearchParams`.
- **Filter:** in memory via the shared facet engine; facet option counts are **disjunctive (except-self)**; header **“N of M”** stays based on the fully filtered result set; Load more pagination (auto-reveal two `PAGE_SIZE` batches via IntersectionObserver, then manual button; no artificial append delay)
- **Route:** `urlSync` (default true) — `q` plus facet ids as comma-separated query params (no `category`; load-more depth is session-only)
- **Section deep links:** Prefer Site path `/products` + freeform `link.query` (e.g. `industry=%slug%` on a Solution LP) — see [ADR-020](../../../docs/adr/0020-component-to-section-playbook.md) § Section link → catalog query
- **Payload:** library `productStyle` is `{slug, title}` only; `propertyTitles` are hoisted onto `ProductLibraryResult`

- **Facet combine:** across facet groups = **AND**; within Sustainability and Performance = **AND**; within Product Line, Product Style, Product type, Industries, and other properties = **OR** (same taxonomy as customizations)
- **Zero-count options:** disabled in the rail (still uncheckable if already selected)

## Out of scope (this ticket)

- Category tabs / Categories left panel
- Sort control
- Studio embed section
- Mid-page CTA band
- Bookmark/compare persistence
- Making the `(site)` layout cacheable (PROD-2599 L4 follow-up)
