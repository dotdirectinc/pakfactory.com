# Site search (PROD-2525)

The ⌘K search dialog on www. Three parts, one ticket each:

| Part | Ticket | Status |
| --- | --- | --- |
| `site_search` Algolia index (this file, today) | PROD-3109 | built |
| `/api/search` route + abuse gate | PROD-3110 | not started |
| Dialog + header trigger | PROD-3111 | not started |

## The index — `site_search`

**One index for every type**, with `type` and `group` facets. The dialog makes one query per keystroke and reads its rail counts from the facets. Per-type indexes would cost one billed query per tab on every keystroke.

It is separate from `content_*` (admin search, ADR-018) and `posts` (blog typeahead). Neither of those changed.

Source of truth: [`packages/sanity/src/algolia/site-search.ts`](../../../packages/sanity/src/algolia/site-search.ts). The whole record is one GROQ query, so the backfill and the Function cannot disagree.

### What is in it

A document is indexed exactly when its www page exists. The gate per type is the route's own:

| Sanity `_type` | `type` | `group` (rail tab) | Link | Gate |
| --- | --- | --- | --- | --- |
| `product` | `product` | Products | `/products/{slug}` | `PRODUCT_HAS_PAGE` |
| `productLine` | `product-line` | Products | `/products/{slug}` | `LINE_STYLE_HAS_PAGE` and it has a product or a style |
| `productStyle` | `product-style` | Products | `/products/{line}/{slug}` | `LINE_STYLE_HAS_PAGE` and its line is Active or Discontinued |
| `customizationOption` | `customization` | Customizations | `/customizations/{category}/{slug}` | `OPTION_ACTIVE` and `HAS_DETAIL_PAGE` |
| `solution` | `solution` | Solutions | `/solutions/{slug}` | `SOLUTION_ACTIVE` |
| `solutionStyle` | `solution-style` | Solutions | `/solutions/{solution}/{slug}` | Active, under an Active solution |
| `post` | `guide` | Guides | `/blog/{slug}` | blog filter and `publishedAt <= now()` |
| `caseStudy` | `case-study` | Resources | `/case-studies/{slug}` | `publishedAt <= now()` |
| `expertiseStage` | `expertise` | Resources | `/expertise/{slug}` | not Discontinued |
| `pressRelease` | `press-release` | Resources | `/newsroom/{slug}` | `publishedAt <= now()` |

All types also need a slug and a title, must be published (no drafts or release versions), and must not have `allowIndex` set to false.

Materials are customization options, so they show under Customizations. **Property values** have no tab and no record of their own. Their titles are `tags` on the products and options that carry them, so searching "soft-touch" finds those. Whether a value should also be its own result, linking to the filtered customization catalog (`/customizations?category=…&{property}={value}`), is still open on PROD-3109.

**Not indexed:**
* customization categories (`/customizations/[category]` is a placeholder page)
* expertise services (no route)
* bundles (none exist)
* policies, About and Contact, which are fixed quick links in the dialog

### Record

`objectID, type, group, typeRank, kind, title, href, summary, image, imageAlt, parents[], tags[], publishedAtTimestamp`

* `href` is a host-free www path. Blog posts are on the www origin in production, but on staging they live at `staging-blog.pakfactory.com`. The API resolves that host.
* `parents` holds the titles of what the document sits under: line, styles, solutions, option type and category, client, blog category.
* `image`: lines, styles and solutions have no images of their own, so they borrow the first child's image. Products and options without an image get none, which matches www.
* Records are about 0.6 KB each. Algolia's limit is 10 KB.

Settings (`SITE_SEARCH_SETTINGS`):
* searchable attributes: `title`, `tags`, `parents`, `summary`
* facets: `type`, `group`, and `kind` (filter only)
* ties go to `typeRank`, so products come before press releases
* English plurals and stop words are ignored

### Keeping it in sync

| How | When |
| --- | --- |
| Function `site-search-sync` (`functions/site-search-sync/`, `sanity.blueprint.ts`) | On every create, update or delete of an indexed type, pinned to the blueprint's dataset. Its projection carries only the id: Function projections cannot run sub-queries, so it reads the record back with `SITE_SEARCH_DOC_QUERY`. No record means remove it. |
| Backfill `pnpm --filter @pakfactory/studio run algolia:site-search -- --dataset development` | First fill, and after a parent's status change. Dry run by default; `--confirm` applies the settings and swaps the contents atomically (`replaceAllObjects`). It refuses to write 0 records. |

The Function bundle cannot import `@pakfactory/sanity`, so it carries a **generated** copy of the query (`functions/site-search-sync/query.generated.ts`). After changing `site-search.ts`, run:

```bash
pnpm --filter @pakfactory/sanity run gen:site-search-fn
```

`site-search.test.ts` fails if the copy is stale.

**Known gaps** (the next backfill fixes both):
* A parent switched off (line, style, solution, type or category) fires no event for its children. The API drops hits whose page is gone (PROD-3110).
* A case study, press release or post saved with a future `publishedAt` is skipped, and nothing re-fires when that date passes.

### Counts (`development`, 2026-10-19, dry run)

1,908 records:

| Group | Records |
| --- | --- |
| Products | 1,340 (1,244 products, 13 lines, 83 styles) |
| Customizations | 214 |
| Solutions | 128 (19 solutions, 109 styles) |
| Guides | 177 |
| Resources | 49 (38 case studies, 6 expertise, 5 press releases) |

Products (1,244) and customizations (214) match the admin `content_*` indexes, which use the same gates.

### Production

Today the index is filled from `development` for staging. Which index production reads, and filling it from `production`, are release-readiness items, not part of PROD-3109.

## Cost controls (PROD-3110, planned)

These are recorded here so the route ticket starts from the decisions already made on 2026-10-16:
* a server-only search key restricted to `site_search`, with `maxQueriesPerIPPerHour`
* a 250 ms debounce and a 2-character minimum
* no query when the dialog opens
* CDN-cached GET requests on `/api/search`
* an in-memory per-instance limit plus a site-wide hourly budget kept in Supabase
* a Vercel Firewall rule (20 requests per 10 s per IP → 3-minute block), to be recreated on Cloudflare under PROD-2240
* `/api/search` disallowed in `robots.txt`
* Algolia usage alerts
