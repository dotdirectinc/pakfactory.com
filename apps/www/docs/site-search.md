# Site search (PROD-2525)

The ⌘K search dialog on www. One ticket per part:

| Part | Ticket | Status |
| --- | --- | --- |
| `site_search` Algolia index | PROD-3109 | built, sync Function deployed |
| `/api/search` route + abuse gate | PROD-3110 | built |
| Dialog + header trigger (now Advanced mode) | PROD-3111 | built |
| Basic mode, the default: recents, loose suggestions, all results on Enter | PROD-2525 (#912) | built 2026-10-21 |
| Find products by SKU | PROD-3136 (#918, #922) | built 2026-10-21; Function redeployed, `development` backfilled |
| Show the SKU on results | PROD-3154 | built 2026-10-23; www only, no reindex |
| Rank Advanced browse picks by clicks | PROD-3122 | backlog (Advanced only) |

After changing the record or settings in `packages/sanity/src/algolia/site-search.ts`: run `gen:site-search-fn`, merge, redeploy the Functions stack (`npx sanity blueprints deploy` from the repo root; it re-uploads all four Functions; this one is pinned to `PINNED_DATASET` in `sanity.blueprint.ts`, currently `development`), then run the backfill with `--confirm`. Searches are CDN-cached for up to ~70 minutes, so re-test with a query nobody has run since the change.

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

`objectID, type, group, typeRank, kind, sku, title, href, summary, image, imageAlt, hoverImage, parents[], tags[], publishedAtTimestamp`

* `href` is a host-free www path. Blog posts are on the www origin in production, but on staging they live at `staging-blog.pakfactory.com`. The API resolves that host.
* `parents` holds the titles of what the document sits under: line, styles, solutions, option type and category, client, blog category.
* `image`: lines, styles and solutions have no images of their own, so they borrow the first child's image. Products and options without an image get none, which matches www.
* `hoverImage`: products only — Sanity `images[1]` for the ⌘K product-grid swap (PROD-3130). Null on every other type and on products with one still. After this field lands, reindex (`gen:site-search-fn`, blueprint deploy, backfill `--confirm`); old records simply do not swap.
* Records are about 0.6 KB each. Algolia's limit is 10 KB.

Settings (`SITE_SEARCH_SETTINGS`):
* searchable attributes: `sku`, `title`, `tags`, `parents`, `summary`
* `sku` (products only, PROD-3136) is matched without typos, so an exact SKU finds its product first and a SKU one character off finds nothing by SKU. Temporary `TMP-` codes are left out. The SKU is also returned to the dialog and shown on product results (PROD-3154): beside the title in Basic suggestions, with the typed query in bold, and under the title on the all-results product cards.
* facets: `type`, `group`, and `kind` (filter only)
* ties go to `typeRank`, so products come before press releases
* English plurals and stop words are ignored

### Keeping it in sync

| How | When |
| --- | --- |
| Function `site-search-sync` (`functions/site-search-sync/`, `sanity.blueprint.ts`) | On every create, update or delete of an indexed type, pinned to `PINNED_DATASET` in the blueprint (`development`), not to the deployer's `.env.local`. Its projection carries only the id: Function projections cannot run sub-queries, so it reads the record back with `SITE_SEARCH_DOC_QUERY`. No record means remove it. |
| Backfill `pnpm --filter @pakfactory/studio run algolia:site-search -- --dataset development` | First fill, and after a parent's status change. Dry run by default; `--confirm` applies the settings and swaps the contents atomically (`replaceAllObjects`). It refuses to write 0 records. |

Run the Function locally against one real document (it writes or removes that one record). Run it from the repo root. `--project-id` is required there, because the CLI config with the project lives in `apps/studio`:

```bash
npx sanity functions test site-search-sync --project-id 8293wrxp --dataset development \
  --document-id <published _id> --with-user-token
```

The test removes most of the installed packages (seen twice on 2026-10-19), so the www dev server fails afterwards with `Error evaluating Node.js code` / `Cannot find module '@tailwindcss/postcss'`. Reinstall from the repo root, then restart the dev server:

```bash
CI=true pnpm install --frozen-lockfile
```

The test also leaves a `.build/` folder in the Function's directory. It is gitignored.

The Function bundle cannot import `@pakfactory/sanity`, so it carries a **generated** copy of the query (`functions/site-search-sync/query.generated.ts`). After changing `site-search.ts`, run:

```bash
pnpm --filter @pakfactory/sanity run gen:site-search-fn
```

`site-search.test.ts` fails if the copy is stale.

**Known gaps** (the next backfill fixes both):
* A parent switched off (line, style, solution, type or category) fires no event for its children, so their records stay until the next backfill. The API does not re-check pages per hit; a stale hit opens the page's not-found state.
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

## Search API (PROD-3110)

The dialog never talks to Algolia. It calls two www routes:

| Route | What it returns | Calls Algolia? | Cache |
| --- | --- | --- | --- |
| `GET /api/search?q=…&type=…` | Hits grouped by rail tab (`groups[]`), total, facet counts (`counts.group`, `counts.type`) | Once per cache miss | `s-maxage=600, stale-while-revalidate=3600`; errors and 429s `no-store` |
| `GET /api/search/idle` | Product lines (title, link, image) and quick links, for the empty dialog | Never: cached Sanity catalog (`listLines()`) | `s-maxage=600, stale-while-revalidate=86400` |

`/api/search` details:
* `q` is normalized (lower-case, single spaces, max 80 characters). Under 2 characters it returns an empty result without calling Algolia. The dialog should send the normalized string so equivalent queries share one CDN entry.
* **SKU queries** (`COR-008`, `cor 008`, `RGD-060-AP2`, or a prefix like `cor-00`; PROD-3136) are never loosened, so a mistyped SKU returns nothing instead of hundreds of loose matches. The product whose SKU matches exactly goes first: Algolia splits SKUs at the hyphen, so `COR-008-BR1` matches "cor-008" as well as `COR-008` does. `sku` is retrieved for this ordering and, since PROD-3154, passed to the client for display.
* `match=loose` (Basic mode) sets Algolia `removeWordsIfNoResults: allOptional`: when every word together finds nothing, words become optional ("blue kraft mailer" → 211 hits instead of 0). Without it, every word must match (typos and the last word's prefix are still allowed). It is a separate CDN cache entry.
* `type` is a rail tab (`products`, `solutions`, `customizations`, `guides`, `resources`) or one record type (`product-line`, …). Anything else is ignored. With a filter, the counts cover that filter only, so the dialog keeps its rail counts from the unfiltered query.
* 30 hits per query, ranked across all groups. A group with a count but no hits in the top 30 (often Customizations next to "mailer") fills when its tab is opened.
* Guide links are absolute, on `NEXT_PUBLIC_BLOG_URL` (staging: `staging-blog.pakfactory.com/blog`). Everything else is a www path.
* Code: [`src/app/api/search/route.ts`](../src/app/api/search/route.ts), [`src/lib/search/`](../src/lib/search/).

### Cost controls

Each layer catches what the one before lets through. Only a request that misses the CDN and passes all three in-code limits costs an Algolia query.

| Layer | Limit | Where |
| --- | --- | --- |
| Dialog | 250 ms debounce, 2-character minimum, no query on open | PROD-3111 |
| CDN | Repeat queries answered from cache for 10 minutes | `Cache-Control` above |
| Edge firewall | 20 requests per 10 s per IP → 429 for the rest of the window | Vercel Firewall rule, below |
| Per IP, per instance | 30 per minute (`SITE_SEARCH_PER_IP_PER_MINUTE`) | `search-gate.ts` |
| Per instance | 300 per minute (`SITE_SEARCH_INSTANCE_PER_MINUTE`) | `search-gate.ts` |
| Site-wide | 3,000 per clock hour (`SITE_SEARCH_HOURLY_BUDGET`) | `search-gate.ts` + Supabase |
| Algolia | Per-visitor cap on the key (sent as `X-Algolia-UserToken`, a hash of the IP) | dedicated key, release readiness |

A blocked request gets `429` with `Retry-After` and `{"error":"rate_limited","reason":"ip"|"instance"|"budget"}`.

**Site-wide budget.** Each server instance counts searches in memory and, at most every 10 s, adds the delta to Supabase (`public.site_search_budget_add`, pakfactory.com-backend migration `20261019200000_site_search_budget.sql`) and reads back the hour's total. That is one database write per instance per 10 s, never one per search. If Supabase is unreachable, search keeps answering and the per-IP and per-instance limits still apply; the delta is retried on the next flush.

The RPC is callable with the public anon key (www has no service-role key). It only accepts 0–500 per call and picks the hour itself. Anyone with the anon key could still push the hour over budget and switch search off until the hour ends; that costs search, not Algolia money. To close it: give www a server-only Supabase key and grant the function to `service_role` only.

**Edge firewall rule** (live since 2026-10-19 as `rule_site_search_rate_limit_7jXXSu`; recreate on Cloudflare under PROD-2240). Added with the Vercel CLI from the repo root, then `vercel firewall publish`:

```bash
vercel firewall rules add "site-search rate limit" --condition '{"type":"path","op":"pre","value":"/api/search"}' --action rate_limit --rate-limit-window 10 --rate-limit-requests 20 --rate-limit-keys ip --rate-limit-action rate_limit --yes
```

| Field | Value |
| --- | --- |
| Name | `site-search rate limit` |
| If | Request path **starts with** `/api/search` |
| Then | Rate limit, fixed window **10 s**, **20** requests, key **IP** |
| Action on limit | **Rate limit** (429) until the 10 s window ends. There is no lockout: Vercel's `rate_limit` action has none, and a lockout needs `deny` (403) with 1m/5m/15m/30m/1h only (PROD-3110 AC 3, amended) |

**Env** (www, server-only; also listed in `turbo.json`). Set on Vercel `pakfactory-com`: `ALGOLIA_APP_ID` and `ALGOLIA_SEARCH_KEY` for **Preview** (2026-10-19). **Production has neither yet.** Without an app ID and a key, `/api/search` answers `503 search_unavailable`:

| Name | Default | Notes |
| --- | --- | --- |
| `ALGOLIA_APP_ID` | — | Falls back to `NEXT_PUBLIC_ALGOLIA_APP_ID` |
| `ALGOLIA_SEARCH_KEY` | — | Falls back to `NEXT_PUBLIC_ALGOLIA_API_KEY` (the blog's search key). Never the write key |
| `SITE_SEARCH_HOURLY_BUDGET` | 3000 | Lower it on a preview deployment to test the 429 |
| `SITE_SEARCH_PER_IP_PER_MINUTE` | 30 | |
| `SITE_SEARCH_INSTANCE_PER_MINUTE` | 300 | |

**Release readiness (not PROD-3110):**
* A dedicated search key: ACL `search`, index `site_search`, Max API calls/IP/hour set. Creating it needs the Algolia Admin key or the dashboard; the write key cannot create keys.
* Restrict the blog's public key (`NEXT_PUBLIC_ALGOLIA_API_KEY`) to `posts` with a per-IP cap. Today it can query every index, `site_search` included, directly from a browser, which bypasses all the limits above.
* Rotate the Algolia write key.
* Firewall rule on production, Algolia usage alerts.
* `pakfactory.com/robots.txt` is served by Magento; add `Disallow: /api/search` there when www serves the apex. The www `robots.txt` already disallows it.

## Modes — Basic (default) and Advanced

`<SiteSearchDialog mode="basic" | "advanced">`, default `basic` (decided 2026-10-21). The tab-rail design below is **Advanced**, paused until a later redesign; it stays in code and runs with `mode="advanced"`. The two share the shell, input, result sections and click tracking (`site-search-shared.tsx`).

**Basic** (`site-search-basic.tsx`): one column, no rail, nothing recommended up front, no `/api/search/idle` request.

| State | Shows |
| --- | --- |
| Empty field | The visitor's recent searches (localStorage, ×  to remove one, Clear for all). With none, a one-line hint. |
| Typing (2+ characters, 250 ms debounce) | Up to 6 loose matches (`match=loose`) in Algolia rank order, typed words in bold (a 1-character word such as `1` or `&` only where it stands alone, PROD-3149), then "See all results for "…"". |
| Enter, or "See all results" | Every result for the query (up to 30), grouped Products / Solutions / Customizations / Guides / Resources, with "N results for "…"" (or "Top 30 of N"). Editing the query goes back to suggestions. |

Suggestions and all results read the same `/api/search` response, so Enter costs no extra request. A recent search runs straight to all results. Opening a result reports the click and saves the query, as in Advanced. Desktop is a dark palette anchored near the top (720 px wide, as tall as its content up to 640 px); mobile is the same light full-screen sheet with Cancel.

## Dialog — Advanced mode (PROD-3111)

The header search icon and ⌘K / Ctrl+K open one dialog, after the POC (`pakfactory.com-poc` `src/shared/components/search/SiteSearch.jsx`):

* **Styling** copies the POC's classes (sizes, colours, radii) inside the search modal only: a deliberate exception to DESIGN.md's tokens and 8pt spacing (Richard, 2026-10-20). Radii are the POC's px (its `--radius` is 16px). Images keep the site's cream `--product-image-bg` well (PROD-3102), and the rail is 192 px instead of 176 px to fit the counts. The POC also grows its root font on wide screens (17 px at ≥1600 px, 18 px at ≥1920 px); www keeps a fixed 16 px root site-wide, so the modal's contents get the same growth with CSS `zoom` (1.0625 / 1.125) inside a box that stays 960×720, as in the POC.
* **Desktop (768 px and up):** a dark dialog (`#141416`, white text, `black/60` blurred overlay, as the POC) with a rail (Trending, Products, Solutions, Customizations, Guides, Resources), the input, chips, and sections. Products and solutions show as a grid, customizations as pills, guides and resources as cards.
* **Mobile (under 768 px):** a light full-screen sheet with Cancel and no rail.
* **Empty state** (no Algolia call): recent searches, then the POC's curated chips, then each tab's **browse picks** from `/api/search/idle` (`lib/search/search-browse-data.ts`, rules in `search-browse-picks.ts`). The picks are rule-based for now; a follow-up swaps in the most-clicked item per slot once click data exists.

  | Tab | Shows | Rule |
  | --- | --- | --- |
  | Trending | product-lines row, 4 products, 8 solutions, customization categories, 2 guides, 2 case studies, latest press release, quick links | a few of each tab |
  | Products | product-lines row (tap = search, as in the POC), 8 products | the 8 lines with the most products → each line's first product with an image |
  | Solutions | all solutions with a page, as pills (most have no image yet) | title order |
  | Customizations | category pills → `/customizations?category=…`, then 8 options | first 2 options with a page per category |
  | Guides | 4 latest blog posts | newest `publishedAt` |
  | Resources | 4 latest case studies, latest press release, expertise stages | newest first |

  Each tab ends with "Browse all" links. Everything is read with the `site_search` filter and projection, so links, images and visibility match search results (products with `allowIndex` off never show).
* **Typing:** waits 250 ms, needs 2 characters, and sends the normalized query. Rail counts come from the unfiltered query; opening a tab runs the filtered query.
* **Keyboard:** ↑/↓ move through every result in order, Enter opens it, Esc closes. Chips are not in the arrow order.
* **States:** "Searching…", no results ("No results for "…"."), too many searches (429) and search unavailable. The last two keep the browse content visible.
* **Recent searches:** localStorage `www-search-recents-v1`, 6 entries.
* **Click tracking:** opening a search result posts `{queryID, objectID, position}` to `POST /api/search/click`, which sends an Algolia Insights `clickedObjectIDsAfterSearch` event ("Search result clicked", userToken = hashed IP). Search responses carry `queryID` (`clickAnalytics: true`) and each hit's `position`. The route allows 60 clicks per IP per minute; the edge rule covers it too. Browse picks are not tracked (there is no query). This history is what the follow-up ranks by.
* **GTM:** `site_search` (`search_term`, `search_filter`, `results_count`) once per settled query, and `site_search_no_results` (`search_term`) when it returns nothing. Both go through `lib/analytics.ts` `captureEvent`, so PostHog can take over later.

Code: `src/components/search/` (provider, trigger, dialog shell, `site-search-basic.tsx`, `site-search-advanced.tsx`, `site-search-shared.tsx`, section) and `src/lib/search/` (`use-site-search.ts`, `use-search-idle.ts`, `search-recents.ts`, `search-browse.ts`, `search-browse-data.ts`, `search-browse-picks.ts`, `user-token.ts`); routes `app/api/search/idle` and `app/api/search/click`.

`/api/search/idle` reads one cached GROQ query (about 150 KB raw, 21 KB response). It used to load the `/products` library for line images, which is about 3.9 MB, over Next's 2 MB data-cache limit, so every CDN miss refetched it from Sanity (fixed in PROD-3111). The header icon goes in through `SiteNav`'s `search` slot (`packages/ui`), from `components/layout/site-nav-request-slot.tsx`.

Smoke tests: `e2e/search/site-search.spec.ts` (desktop and a 390 px phone viewport) cover Basic mode, the one mounted. Advanced is not covered while paused. They are read-only; run them with `pnpm --filter @pakfactory/www test:e2e e2e/search`.

**Deviations from the POC** (also listed on PROD-2525):
* counts on the rail
* keyboard navigation
* Resources instead of Materials; materials stay searchable under Customizations
* browse picks are chosen by rule from live content (the POC sampled its static index); solutions and expertise show as pills because most have no image yet

