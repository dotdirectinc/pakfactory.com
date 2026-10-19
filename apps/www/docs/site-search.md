# Site search (PROD-2525)

The ⌘K search dialog on www. Three parts, one ticket each:

| Part | Ticket | Status |
| --- | --- | --- |
| `site_search` Algolia index | PROD-3109 | built, sync Function deployed |
| `/api/search` route + abuse gate | PROD-3110 | built |
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
| Edge firewall | 20 requests per 10 s per IP → blocked for 3 minutes | Vercel Firewall rule, below |
| Per IP, per instance | 30 per minute (`SITE_SEARCH_PER_IP_PER_MINUTE`) | `search-gate.ts` |
| Per instance | 300 per minute (`SITE_SEARCH_INSTANCE_PER_MINUTE`) | `search-gate.ts` |
| Site-wide | 3,000 per clock hour (`SITE_SEARCH_HOURLY_BUDGET`) | `search-gate.ts` + Supabase |
| Algolia | Per-visitor cap on the key (sent as `X-Algolia-UserToken`, a hash of the IP) | dedicated key, release readiness |

A blocked request gets `429` with `Retry-After` and `{"error":"rate_limited","reason":"ip"|"instance"|"budget"}`.

**Site-wide budget.** Each server instance counts searches in memory and, at most every 10 s, adds the delta to Supabase (`public.site_search_budget_add`, pakfactory.com-backend migration `20261019200000_site_search_budget.sql`) and reads back the hour's total. That is one database write per instance per 10 s, never one per search. If Supabase is unreachable, search keeps answering and the per-IP and per-instance limits still apply; the delta is retried on the next flush.

The RPC is callable with the public anon key (www has no service-role key). It only accepts 0–500 per call and picks the hour itself. Anyone with the anon key could still push the hour over budget and switch search off until the hour ends; that costs search, not Algolia money. To close it: give www a server-only Supabase key and grant the function to `service_role` only.

**Edge firewall rule** (applied by an approved person in the Vercel dashboard, project `pakfactory-com` → Firewall → Rules; recreate on Cloudflare under PROD-2240):

| Field | Value |
| --- | --- |
| Name | `site-search rate limit` |
| If | Request path **starts with** `/api/search` |
| Then | Rate limit, fixed window **10 s**, **20** requests, key **IP** |
| Action on limit | **Deny** (429) for **3 minutes** |

**Env** (www, server-only; also listed in `turbo.json`):

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
