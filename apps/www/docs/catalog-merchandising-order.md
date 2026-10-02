# Catalog merchandising order (PROD-2739–2749)

How Studio drag order reaches the marketing site. Two mechanisms, one contract: **derive the set, curate the sequence**. Membership stays a query. An order field never hides a member.

Binding product rules stay in [`AGENTS.md`](../../../AGENTS.md). This file is the www + Studio how-built for order only.

## Two mechanisms

| Mechanism | Fields | How an editor sets it |
| --- | --- | --- |
| **Partial curated list** | `styleOrder`, `typeOrder`, `productOrder`, `optionOrder` | Drag rows inside the array on the parent document |
| **Studio list rank** | `orderRank` (`@sanity/orderable-document-list`) | Drag rows in the list pane. The field is hidden on the edit form |

### Partial list

Pinned ids stay in drag order. Everything else follows, sorted by title (`localeCompare` in TS, `order(title asc)` in GROQ).

An empty array, a missing field, and a list that names only deleted documents all collapse to plain alphabetical. A partial list is the normal state.

References are **weak**. Deleting a pinned document succeeds and leaves a dangling entry. Consumers drop entries that do not resolve (`defined(_id)` in GROQ, a map lookup in TS). Do not change these to strong references — `productLine.styles` was removed in PROD-2509 because a strong presentation list made the target undeletable.

The picker is scoped to children of the parent (`productLine._ref`, `category._ref`, `type._ref`, `solution._ref`, or `productStyle[0]._ref`) and excludes ids already in the array. `Rule.unique()` is the publish gate; the filter only keeps the picker from offering a duplicate that then blocks publish.

### `orderRank`

A **LexoRank string**, written by the plugin. `order(orderRank asc)` sorts it. It is not a position integer.

`productLine` and `solution` assign a new document a rank after the current last, so Reset Order is a one-time action.

Declaring schema `orderings` **replaces** the Title sort Sanity generates. Each orderable type restates Title next to `orderRankOrdering`. PROD-2744 shipped Product Lines with only the Ordered entry and dropped Title; PROD-2745 put Title back. The desk helper `orderableList` in [`apps/studio/structure/index.ts`](../../studio/structure/index.ts) sets the sidebar label and the pane heading separately — the plugin otherwise uses one title for both and the pane falls back to the singular schema title.

## Where the site reads it

| Surface | Field | Consumer |
| --- | --- | --- |
| Product line styles grid (`/products/[line]`) | `productLine.styleOrder` | `LINE_STYLES` inside [`CATALOG_PRODUCT_LINE_FIELDS`](../../../packages/sanity/src/queries/catalog.ts), rendered by [`product-line-landing.ts`](../src/lib/catalog/product-line-landing.ts) |
| Solution style collection band | `solution.styleOrder` | [`SOLUTION_STYLES_FOR_SOLUTION_QUERY`](../../../packages/sanity/src/queries/solutions.ts) via `fetchSolutionStylesForSolution` |
| Solution inspirations fallback | `solution.styleOrder` | `relatedSolutionStyles` on the solution landing projection, inherited by an empty `inspirationsGrid` in [`merge-solution-sections.ts`](../src/lib/sections/merge-solution-sections.ts) |
| Configurator type sequence | `customizationCategory.typeOrder` | [`buildStepsFromCatalog`](../src/lib/customization-builder/state.ts) → [`orderTypesInCategory`](../../../packages/sanity/src/customization-type-order.ts) |
| Header mega-menu groups | `orderRank` on the link target | [`sortNavLinksByOrderRank`](../src/lib/site-nav.ts) |

`typeOrder` is projected as plain ids (`coalesce(typeOrder[]._ref, [])` in `CATEGORY_PROJ`) and copied onto each library option as `categoryTypeOrder`. The builder calls `orderTypesInCategory` after it buckets options. Category **tabs** and the builder’s category sequence still use the hard-coded slug list below — `typeOrder` orders types inside a category.

### Header sort

`sortNavLinksByOrderRank` runs on every header mega-menu group (`mapGroupLinks`). A link contributes a rank when `pathTarget.orderRank` or `internalLink.orderRank` is a non-empty string.

- Path links resolve a product line, product, style, or customization option. Only **product lines** store `orderRank`, so a Products path link sorts and a product or style path link does not.
- An internal link sorts when its target document has `orderRank`. That field exists on `productLine`, `customizationCategory`, and `solution`.

Ranked links in a group come first, compared as strings. Unranked links keep their document order. Two equal ranks keep document order.

Footer columns do not use this sort.

## Stored, and not read by a page yet

Editing these in Studio changes the document. It does not change the site until the named consumer calls the helper.

| Field | Helper | What the site does today |
| --- | --- | --- |
| `productStyle.productOrder` | [`orderProductsInStyle`](../../../packages/sanity/src/product-order.ts) | [`listProductStyleLibrary`](../src/lib/catalog/catalog.ts) filters the title-sorted product library in JavaScript. Cap **12** (`Rule.max(12)`). Picker matches `productStyle[0]._ref` only — the primary style, which is also the style page’s membership test. |
| `customizationType.optionOrder` | [`orderOptionsInType`](../../../packages/sanity/src/option-order.ts) | The library query is `order(title asc)`. `buildStepsFromCatalog` pushes each option in arrival order. No `Rule.max()`: the largest type holds 22 options (Pouch Layer), so ordering the whole type is in bounds. |
| `customizationCategory.orderRank` | — | Category tabs, the library facet, and the builder rail use [`compareCategorySlugs`](../src/lib/catalog/customization-category-order.ts): `dimensions`, `materials`, `printing`, `finishing`, `additional-customization`. `dimensions` is the builder’s own first step, so the list cannot be replaced by `order(orderRank asc)` on categories alone. |
| `solution.orderRank` | — | Solution listing queries (`SOLUTIONS_WITH_PAGES_QUERY`, case-study filter chips) stay `order(title asc)`. A nav item whose internal target is a solution still sorts with the header rule above. |

`productOrder` is highlights only. Filling it with every product in the style is the shape D31 rejected (order and gate in one array, unusable around 200 products).

## Still a fixed sort

These surfaces have no merchandising field in front of them:

| Surface | Sort |
| --- | --- |
| `/products` library | `CATALOG_PRODUCT_LIBRARY_QUERY` — `order(title asc)` |
| Product line index queries | `CATALOG_PRODUCT_LINES_QUERY` — `order(title asc)` |
| `/customizations` option grid | Library query `order(title asc)`; category tabs use `compareCategorySlugs` |
| Solution-style product grid | `SOLUTION_STYLE_ORDER` = `order(_createdAt desc, title asc)` in [`solution-style-filter.ts`](../../../packages/sanity/src/solution-style-filter.ts). That constant orders **products** inside a solution style. `solution.styleOrder` orders the **styles** on the solution. |

## Editor checklist

1. **Styles on a line or solution, or types in a category** — open the parent, drag the order array. Leave the tail unlisted; it sorts by title.
2. **Product Lines, Customization Categories, or Solutions in the Studio sidebar** — drag the list pane. Sort menu **Ordered** is `orderRank`. **Title** is alphabetical and is still available.
3. **Products at the top of a style, or options at the top of a type** — the fields save, and the helpers exist. The pages above do not call them yet.

## Pitfalls

- **GROQ coalesce is load-bearing** on both tiers of `LINE_STYLES`, `SOLUTION_STYLES_FOR_SOLUTION_QUERY`, and `relatedSolutionStyles`. `styleOrder` is unset until someone drags. In GROQ, `null + array` is null, and `_id in null[]._ref` matches nothing. Dropping the first `coalesce(..., [])` makes the projection undefined; dropping the second makes the band `[]`. Either empties the grid with no error. Pinned by [`line-style-order.test.ts`](../../../packages/sanity/src/queries/line-style-order.test.ts) and [`solution-style-order.test.ts`](../../../packages/sanity/src/queries/solution-style-order.test.ts).
- **Same contract in TS.** [`customization-type-order.test.ts`](../../../packages/sanity/src/customization-type-order.test.ts), [`option-order.test.ts`](../../../packages/sanity/src/option-order.test.ts), [`product-order.test.ts`](../../../packages/sanity/src/product-order.test.ts), and [`state.type-order.test.ts`](../src/lib/customization-builder/state.type-order.test.ts). The tail is sorted inside the helper; input order is not trusted.
- **`orderRank` is a string.** Do not read it as “third”.
- **Desk `orderings` replaces Title.** Restate Title beside `orderRankOrdering`.
- **Primary style only for `productOrder`.** A product whose style reference sits past index 0 is absent from that style page and absent from the picker. Widening the page means widening the filter in [`productStyle.ts`](../../studio/schemas/productStyle.ts) with it.

## Related

- Products library (filters, visibility): [`products-catalog.md`](./products-catalog.md)
- Customizations library (facets, card media, rules): [`customizations-catalog.md`](./customizations-catalog.md)
