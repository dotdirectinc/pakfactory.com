# Blog app — working memory

Last updated: 2026-06-18.

**AI / Jira binding rules:** [`docs/blog-3-jira-conventions.md`](../../docs/blog-3-jira-conventions.md) · [`CLAUDE.md`](./CLAUDE.md) · [`AGENTS.md`](../../AGENTS.md).

## Route build progress (vs BA target — `docs/route-design-ba.png`)

Snapshot 2026-05-27. Compare the table below against the BA screenshot on every route task (route-design conformance rule in `CLAUDE.md`).

| BA route                             | Status                                                                                                                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` home                             | ✅ PROD-1497                                                                                                                                                                                                    |
| `/all` (+ pagination)                | ✅ PROD-1498                                                                                                                                                                                                    |
| `/{category}` archive (+ pagination) | ✅ PROD-1499                                                                                                                                                                                                    |
| `/{slug}` single post                | ✅ resolves via `[category]` (PROD-1597); full page rebuild → PROD-1502, **blocked on PROD-1490** schema rebuild (see [`docs/blog-content-spec-gap-analysis.md`](../../docs/blog-content-spec-gap-analysis.md)) |
| `/tag/{slug}`                        | ✅ PROD-1500                                                                                                                                                                                                    |
| `/author/{slug}`                     | ✅ PROD-1501                                                                                                                                                                                                    |
| `/rss.xml`                           | ✅ PROD-1505                                                                                                                                                                                                    |
| `/sitemap.xml`                       | ✅ PROD-1596 (utility; not on BA tree)                                                                                                                                                                          |
| `/search` (+ `?q=`)                  | ✅ PROD-1503                                                                                                                                                                                                    |
| `/contribute`                        | ✅ PROD-1504                                                                                                                                                                                                    |

URL scheme: posts canonical at `/{slug}`, no `/category/` prefix (PROD-1597); URL base subpath-ready (PROD-1596). Blog favicon committed at `apps/blog/src/app/favicon.ico`. Branch `feature/blog`; tickets above in Request For Approval, not yet merged.

---

## Primary navigation (blog header)

The sticky header category strip (`SiteNav` → `SiteNavCategories` in root `layout.tsx`) reads **only** the Studio singleton `blogNavigation.primaryNavigation.categories` via `BLOG_NAV_CATEGORIES_QUERY` → `fetchBlogNavCategories()`. Order is exactly what editors drag in **Navigation → Primary Navigation**. When the singleton is missing or empty, the strip is hidden (no fallback to all categories).

- **Backfill legacy data:** `pnpm --filter @pakfactory/studio run migrate:blog-navigation` copies `blogSettings.categoryOrder` when `blogNavigation` is empty.
- **Local seed:** `pnpm seed:blog-dev` writes `blogNavigation` with the dev category order.
- **Cache:** `BLOG_SETTINGS_CACHE_TAG`; revalidate on `blogNavigation` / `blogCategory` webhook updates (`apps/blog/src/app/api/revalidate/route.ts`).
- **Out of scope here:** `/all` browse sidebar, search, and 404 still use `fetchBlogCategories()` (all categories, alphabetical).

---

## Footer navigation (blog footer link grid)

The footer link columns (`SiteFooter` in root `layout.tsx`) read `blogNavigation.footerNavigation.columns` via `BLOG_FOOTER_NAV_QUERY` → `fetchBlogFooterNavigation()`. Order matches Studio **Navigation → Footer Navigation** (columns left to right, sections top to bottom). When the singleton is missing, fetch fails, or columns are empty, the footer falls back to hardcoded columns in `getFallbackFooterColumns()` (`apps/blog/src/lib/blog-footer-nav.ts`).

- **Link model:** each footer link is **Internal** (reference to any [linkable document type](../../apps/studio/lib/linkable-document-types.ts) — blog, website, solutions, resources, static singletons) or **External** (full `https://…` URL). Hrefs resolve at fetch time via `@pakfactory/sanity/resolve-document-href`: blog docs → root-relative paths; www docs → absolute marketing URLs (`external: true`). Optional label overrides the referenced document title. Legacy `href` strings are still resolved until `migrate:blog-navigation` converts them.
- **CMS scope:** link columns only — collaboration CTA, copyright, and social icons stay in code.
- **Backfill / migrate:** `pnpm --filter @pakfactory/studio run migrate:blog-navigation` seeds default footer columns when empty and converts legacy href-based links to references.
- **Local seed:** `pnpm seed:blog-dev` writes primary nav and reference-based footer columns on `blogNavigation`.
- **Cache:** `BLOG_SETTINGS_CACHE_TAG`; revalidate on `blogNavigation` webhook updates (`apps/blog/src/app/api/revalidate/route.ts`).

---

## Studio ↔ blog SEO/Social wiring (backlog — schema done, front-end pending)

The Studio blog schemas were rebuilt against the BA "Blog CMS Field Spec" (2026-06) on the `feature/sanity-studio-ux` branch: all content types now declare SEO/Social via the shared helper [`apps/studio/lib/seo-fields.ts`](../../apps/studio/lib/seo-fields.ts). **The schemas are done; the blog-side GROQ projections + metadata fallbacks are not yet wired.** Contract: [`CLAUDE.md`](./CLAUDE.md) § "SEO & Social field contract". Work the checklist below when connecting Studio to the blog interface.

**Field contract (recap):** field names identical across `post` / `blogCategory` / `blogTag` / `author` / `blogPage`. Robots = `allowIndex` / `allowFollow` / `noImageIndex` (NOT inverted `noindex`). `canonical` on `post` + `blogPage` only. Fallbacks resolve in GROQ/`generateMetadata`, never the schema.

### A. `blogPage` `noindex` → `allowIndex` migration (breaking — do first)

`blogPage` dropped the inverted `noindex` boolean for the `allowIndex`/`allowFollow`/`noImageIndex` trio. Two consumers still read the old field:

- [x] [`packages/sanity/src/queries/blog.ts`](../../packages/sanity/src/queries/blog.ts) — L175 projection `noindex,` → project `allowIndex, allowFollow, noImageIndex`; L190 filter `&& noindex != true` → `&& allowIndex != false`.
- [x] [`src/lib/blog-page.ts`](./src/lib/blog-page.ts) — L17 type `noindex?: boolean` → the three booleans; L56 robots `page.noindex ? { index:false, follow:true } : undefined` → derive `{ index: allowIndex !== false, follow: allowFollow !== false }` (+ `noimageindex` when set).

Degrades gracefully until done (field absent → page indexed), so no crash — but editor toggles are inert until wired.

### B. Per-type SEO/Social projection + metadata fallbacks

For each type, project the SEO/Social fields and resolve the fallback chain in `generateMetadata` (or a shared `resolveSeo()` helper):

- [x] **`post`** — metadata via `buildDocMetadata` in `blog-post.ts`; GROQ projects SEO/social + `lastModified`. Tier 1 JSON-LD: `dateModified`, `NewsArticle` for `packaging-news`. Remaining PROD-1502: `tldr`, `relatedPosts`, FAQ UI.
- [x] **`blogCategory`** — `buildCategoryArchiveMetadata` + GROQ SEO/social + `bannerImageUrl`.
- [x] **`blogTag`** — `buildTagArchiveMetadata` + GROQ SEO/social; robots respect `allowIndex` default-off via `getTagListingRobots`.
- [x] **`author`** — `buildAuthorMetadata`; GROQ `socialLinks`/`tagline`/`shortBio`; `author-jsonld.ts` `sameAs` + `author-header.tsx` updated.
- [x] **`blogPage`** — `buildBlogPageMetadata`; home singleton SEO via `buildBlogHomeMetadata` + `srHeading` (`sr-only` H1 on `/`).

Shared helper: [`src/lib/resolve-seo.ts`](./src/lib/resolve-seo.ts) (`buildDocMetadata`, `resolveCanonicalUrl`, `resolveDocRobots`). Global OG fallback: [`src/lib/blog-global-settings.ts`](./src/lib/blog-global-settings.ts).

### C. Global + settings-driven defaults

- [x] **OG image global default** — `BLOG_GLOBAL_SETTINGS_QUERY` + `fetchBlogGlobalSettings()` → `buildDocMetadata` / post JSON-LD org logo.
- [ ] **Blog Settings token formats** — `blogSettings` now has `postDefaults`/`categoryDefaults`/`tagDefaults`/`authorDefaults` (metaTitle/metaDescription **format strings** with tokens, sitemap priority/changefreq, robots defaults). Resolve tokens at render when a doc's own `metaTitle`/`metaDescription` is blank.
- [ ] **Sitemap** — read per-type `priority`/`changefreq` defaults from Blog Settings in `sitemap.ts`.

### D. Dead-seed / removed-field cleanup

Fields removed from schemas that may still be referenced in seeds/queries/front-end:

- [ ] `post.featuredOnHome` (home is now the page builder — see `blog-home.ts`, `BLOG_FEATURED_HERO`, seed `featuredOnHome: true`).
- [ ] `post.relatedCapabilities` / `post.relatedProducts`.
- [ ] `author.credentials` / `author.linkedIn` / `author.personalSite` / `author.xHandle` (→ `socialLinks[]`). **Front-end updated**; verify seeds/scripts.
- [ ] `blogCategory.order` / `blogTag.order` (Studio orderings switched to `title`; check front-end facet sorts that read `order`, e.g. `BLOG_CATEGORY_TAGS_FACET_QUERY`).

> Studio-side schema changes live on `feature/sanity-studio-ux`; blog-side wiring lands on `feature/blog`. Run `sanity deploy` + a typegen refresh after the query projections change so generated types pick up the new fields.

---

## Blog frontend audit (2026-06-18)

Documentation-only pass — preview, JSON-LD/AEO, and route architecture. Full JSON-LD tiers and per-route matrix: **[`docs/blog-jsonld-audit.md`](../../docs/blog-jsonld-audit.md)**.

### Sanity Presentation preview

Preview is a **data-layer + layout** concern — **routes do not need per-route draft-mode code.**

| Layer | Status | Location |
| --- | --- | --- |
| Draft-mode enable/disable | Done | `src/app/api/draft-mode/enable/route.ts`, `disable/route.ts` |
| Visual editing overlay | Done | `src/app/layout.tsx` — `{isDraft && <VisualEditing />}` |
| Draft-aware client | Done | `src/lib/sanity/client.ts` — async `getSanityClient()` + `getPreviewableSanityClient()` alias |
| Studio Presentation config | Done | `apps/studio/sanity.config.ts` — Blog workspace → blog origin + `/api/draft-mode/enable` |
| Location resolvers | Done | `apps/studio/presentation/locations.ts` — `post`, `blogPage`, `blogCategory`, `blogTag`, `author` |

**Flow:** Studio Presentation → `GET /api/draft-mode/enable` → `draftMode().isEnabled` → layout mounts `VisualEditing` → data libs call `getPreviewableSanityClient()` → Sanity `drafts` perspective + stega overlays.

#### Client adoption matrix

| Lib / data | Client | Previewable? |
| --- | --- | --- |
| `blog-post.ts` | `getSanityClient` (async, draft-aware) | Yes |
| `blog-home.ts` (page builder) | `getPreviewableSanityClient` | Yes |
| `blog-page.ts` (landing/static) | `getSanityClient` (async, draft-aware) | Yes |
| category / tag / author / search | `getSanityClient` (async, draft-aware) | Yes (draft mode) |
| redirects / sitemap / RSS | `getPublishedSanityClient` | No (correct) |

### Preview client sharing (blog ↔ www)

| Concern | `apps/blog` | `apps/www` |
| --- | --- | --- |
| Draft-mode check | Single async `getSanityClient()` + sync `getPublishedSanityClient()` | Same |
| Stega + `drafts` | Draft mode only | Draft mode only |
| `next/headers` | Lazy import in `getSanityClient` | Top-level in client module |

**Phase 1 complete (2026-06-18):** blog converged on www API shape; sitemap/RSS/redirects use `getPublishedSanityClient()` only.

**Phase 2 (optional, after both apps stabilize):** extract shared factory to new `@pakfactory/sanity-next` — `createSanityClient`, `createDraftAwareClient({ isDraftMode })`, shared caching. Apps keep env reading and image helpers local.

**Do not:** relocate into `@pakfactory/sanity`; make sitemap/RSS/redirect fetches draft-aware.

### Route architecture vs Studio blog workspace

Current tree is correct per ADR-009 + PROD-1597. The multi-purpose `[category]` segment resolves: category archive → `blogPage` → post → redirect/404.

```
/                          → home (page builder singleton)
/all, /all/page/[n]        → all posts archive
/tag/[slug], /tag/.../page/[n]
/author/[slug]
/search, /contribute
/rss.xml, /sitemap.xml
/[category]                → resolver: category | blogPage | post
/[category]/page/[n]       → category pagination only
/[category]/[postSlug]     → legacy 301 → /{postSlug}
/[...segments]             → redirect map or 404
```

#### Simplifications worth doing (future, ordered)

| # | Change | Rationale |
| --- | --- | --- |
| A | Extract `lib/blog-segment-resolver.ts` from `[category]/page.tsx` | Shared resolution for `generateMetadata` + page component |
| B | Home metadata from `blogPage` home singleton | **Done** — `buildBlogHomeMetadata` + `srHeading` on `/` |
| C | Shared `buildArchiveMetadata()` for page-1 + page-[n] routes | Optional; archives already share `ArchiveLayout` |
| D | Post detail stub → PROD-1502 | Inline stub in `[category]/page.tsx`; don't refactor route shape until full rebuild |
| E | Extend `blogLocations` for Presentation | **Done** — `blogPage`, `blogCategory`, `blogTag`, `author` |

#### Do not simplify

- Flat URL scheme (`/{postSlug}` canonical) — PROD-1597 product decision.
- Separate static routes (`/search`, `/contribute`, `/all`) — reserved segments.
- `revalidate = 60` per route — consistent caching contract.
- Splitting `[category]` into separate `app/[slug]` and `app/[category]` folders without product sign-off.

#### Recommended sequencing

1. This audit doc + JSON-LD audit (done).
2. Section B — SEO/Social GROQ + metadata fallbacks (**done** 2026-06-18).
3. Preview phase 1 — converge client API; wire `blog-page.ts` + `blogLocations` (**done** 2026-06-18).
4. PROD-1502 — post page; Tier 1 JSON-LD (`dateModified`, `NewsArticle`) **done**; Tier 3 AEO (`faqPage`, TL;DR) next. See [`docs/blog-jsonld-audit.md`](../../docs/blog-jsonld-audit.md).

## i18n — DORMANT (English-only, parked 2026-07-07)

Document internationalization (`@sanity/document-internationalization`, EN + FR) was **parked** — it surfaced two homepages (one per language) in the desk and interfered with the team workflow. **No French content exists and no FR is planned yet.** Chosen path: **Option B — hide the chrome, keep the machinery dormant** (not a full removal).

**What changed:**
- `apps/studio/lib/languages.ts` — `SUPPORTED_LANGUAGES` reduced to `en` only (FR entry commented out) → the i18n plugin is single-language / dormant (no French translation affordance).
- `apps/studio/structure/index.ts` — `blogHomepageItem` / `blogTopicsPageItem` **flattened**: each opens the single EN singleton directly, no `SUPPORTED_LANGUAGES.map()` per-language sub-list. Result: one **Homepage**, one **Topic page** in the desk.
- The `language` field was **already** `hidden: true` + `readOnly: true` (`initialValue: 'en'`) in `lib/i18n-fields.ts` — untouched.

**Kept in place (so re-enabling is trivial):** the plugin config + `blogI18nPlugin`, the hidden `language` field on all 5 `BLOG_I18N_SCHEMA_TYPES`, `uniqueSlugPerLanguage` (per-type + language slug scoping), and the `-fr` keys in `BLOG_HOME_PAGE_IDS` / `BLOG_TOPICS_PAGE_IDS`.

**Data:** nothing deleted — consistent with "deploy = schema/structure, not data." Any `-fr` docs / `translation.metadata` (none today) would just be unlisted in the desk, not removed.

**To reactivate French later:**
1. Uncomment `{ id: 'fr', title: 'French' }` in `lib/languages.ts`.
2. Restore the `SUPPORTED_LANGUAGES.map(...)` per-language sub-list in `blogHomepageItem` + `blogTopicsPageItem` (`structure/index.ts` — git history has the exact prior code).
3. (Optional) unhide the `language` field in `lib/i18n-fields.ts` so editors can switch languages.
4. Update blog front-end (GROQ/routes) to handle a `/fr` route + language switch — no French route exists today.

---

## PROD-1504 — `/contribute` contributor page (implemented)

**Jira:** [PROD-1504](https://dotdirect.atlassian.net/browse/PROD-1504) — S2.8 Build `/blog/contribute`. Public route **`/contribute`** (reserved segment; indexable).

| Deliverable               | Location                                             |
| ------------------------- | ---------------------------------------------------- |
| Page + metadata + JSON-LD | `src/app/contribute/page.tsx`                        |
| Pitch form (client)       | `src/app/contribute/_components/contribute-form.tsx` |
| Webhook proxy             | `src/app/api/contribute/route.ts`                    |
| Subject/role options      | `src/lib/contribute-options.ts`                      |
| `webPage` generator       | `packages/seo/src/generators/webPage.ts`             |

### Decisions

- **Submit:** internal `/api/contribute` proxy (mirrors newsletter), not direct client POST to n8n.
- **Subject dropdown:** five home category slugs + **Other** (`HOME_CATEGORY_SLUGS` order).
- **Roles:** industry expert, brand/manufacturer, agency/consultant, freelance writer, academic/researcher.
- **Positioning copy:** on-brand draft in page — **content-team review** pending.
- **Qualifications:** optional; honeypot field `website` rejected server-side.

### Verify

```bash
pnpm --filter @pakfactory/blog typecheck && pnpm build:blog
curl -sI "http://localhost:3003/contribute" | grep -i robots
curl -s "http://localhost:3003/contribute" | grep -o '"@type":"WebPage"'
```

### Ops follow-up

- [ ] Set `CONTRIBUTE_WEBHOOK_URL` (or `NEXT_PUBLIC_CONTRIBUTE_WEBHOOK_URL`) in Vercel when n8n → Zoho flow is ready
- [ ] Content-team review of left-column positioning copy

## PROD-1503 — `/search` page (implemented)

**Jira:** [PROD-1503](https://dotdirect.atlassian.net/browse/PROD-1503) — S2.7 Build `/blog/search`. Faceted-listing pattern mirroring the category archive. Uses **Sanity built-in `match`** (no external search infra, per AC).

| Deliverable                                     | Location                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Route + metadata (always `noindex, follow`)     | `src/app/search/page.tsx`                                                                                           |
| Three-state view + search-tuned sidebar         | `src/app/search/_components/search-view.tsx`                                                                        |
| Data lib (parse, tokenize, fetch, href, robots) | `src/lib/blog-search.ts`                                                                                            |
| GROQ (count + 4 sort variants)                  | `BLOG_SEARCH_POSTS_{COUNT,PAGE_RELEVANCE,PAGE_NEWEST,PAGE_OLDEST,PAGE_TITLE}_QUERY` in `@pakfactory/sanity/queries` |

### Decisions (Richard, 2026-06-02)

- **Filter sidebar:** Categories (nav → `categoryHref`) + Sort + Date. No tag/author facets.
- **Order:** **relevance** default (Sanity `score()`), re-sortable to newest/oldest/title.
- **Match scope:** title (boost 5) + excerpt (boost 2) + body `pt::text` in `score()`; **tags match in the filter for recall but are NOT boosted** — `score()` rejects dereference expressions (`tags[@->title match …]` → "score() function received unexpected expression"). Confirmed via probe against `development`.
- **Empty state:** `CategoryChips` (the 5 categories) as "Popular topics".

### States (all `noindex, follow`)

1. **Empty** (`searchTerm` null): `SearchForm` + Popular-topics `CategoryChips`.
2. **Results** (`totalCount > 0`): count + prefilled `SearchForm` + `PostCard` grid + `Pagination` + `SearchSidebar`.
3. **Zero-results** (`totalCount === 0`): message + `SearchForm` + `PostPopularRail` ("Popular this month", 3 posts).

### Notes / follow-ups

- `searchTerm` is the query tokenized with a `*` suffix per token (prefix match), built in `buildSearchTerm()`.
- Pagination is **query-string only** (`?q=&page=&year=&month=&sort=`) via `searchPageHref()`; relevance + page 1 omitted from the URL.
- **Sidebar is route-private**, not the shared `FilterSidebar` (which is category-tuned: assumes "newest" default and doesn't preserve `q`). _Future: generalize the two behind one component (growing-learner candidate)._
- `/search` is a reserved segment (won't collide with `[category]`); static route wins over the dynamic segment.

### Verify

```bash
pnpm --filter @pakfactory/blog typecheck && pnpm build:blog
curl -s "http://localhost:3003/search?q=box" | grep -o "<article" | wc -l        # >0 (relevance)
curl -sI "http://localhost:3003/search?q=box" ; curl -s … | grep robots          # noindex, follow
curl -s "http://localhost:3003/search?q=zzzznomatch99"                           # zero-results + Popular this month
```

## PROD-1496 — Vercel deployment (approach A, implemented in repo)

**Jira:** [PROD-1496](https://dotdirect.atlassian.net/browse/PROD-1496) — T5.3 Configure Vercel deployment for `apps/blog`  
**Routing:** Blog app serves at **deployment root** (`/`, `/[slug]`, `/rss.xml`). No Next.js `basePath`. Jira “/blog home” = `apps/blog/`, not a URL prefix.

### What was shipped (code)

| Deliverable                                   | Location                                                   |
| --------------------------------------------- | ---------------------------------------------------------- |
| Root routes (no `basePath`)                   | `next.config.ts` — home at `/`                             |
| Unknown paths → app 404                       | `not-found.tsx`, `[slug]` + `[...segments]` → `notFound()` |
| Turbo: blog build after workspace typechecks  | `turbo.json` → `@pakfactory/blog#build`                    |
| `NEXT_PUBLIC_SITE_URL` in Turbo build/dev env | `turbo.json`                                               |
| Local default origin (no path prefix)         | `src/lib/site.ts`                                          |
| Env example                                   | root `.env.example`                                        |

### Vercel project (dashboard + `vercel.json`)

| Setting                           | Value                                                            |
| --------------------------------- | ---------------------------------------------------------------- |
| Root Directory                    | `apps/blog`                                                      |
| Include files outside root        | **On**                                                           |
| Install                           | `pnpm install --frozen-lockfile` (`vercel.json`)                 |
| Build                             | `pnpm turbo run build --filter=@pakfactory/blog` (`vercel.json`) |
| Ignore unchanged                  | `npx turbo-ignore @pakfactory/blog` (`vercel.json`)              |
| Framework                         | Next.js — deployment is managed; no `start` on Vercel            |
| Production `NEXT_PUBLIC_SITE_URL` | Blog origin, e.g. `https://blog.pakfactory.com`                  |

Preview deployments: enable on PRs; set preview Sanity vars as needed.

### Local URLs

| URL                             | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `http://localhost:3003`         | Home (default dev port; override with `PORT`) |
| `http://localhost:3003/<slug>`  | Post                                          |
| `http://localhost:3003/rss.xml` | RSS 2.0 feed (PROD-1505)                      |

Set `NEXT_PUBLIC_SITE_URL=http://localhost:3003` in root or `apps/blog/.env.local` for canonical/JSON-LD (or rely on default in `site.ts`).

### Verification

```bash
pnpm build:blog
pnpm dev:blog

curl -sI http://localhost:3003 | head -5
curl -sI 'http://localhost:3003?page=2' | grep -i robots
```

After deploy:

```bash
curl -sI https://blog.pakfactory.com/ | head -5
curl -sI https://blog.pakfactory.com/unknown-slug | head -8
```

### Ops follow-up

- [ ] Create Vercel project + env vars in dashboard
- [ ] DNS for `blog.pakfactory.com`
- [ ] Attach blog hostname to this Vercel project (routes at `/` on that host)
- [ ] Green production + preview builds

---

## PROD-1495 — noindex rules on listing pages (implemented)

**Jira:** [PROD-1495](https://dotdirect.atlassian.net/browse/PROD-1495) — T5.2 Configure noindex rules across blog listing pages

### Purpose

Paginated archive and filtered listing URLs should not be indexed (`noindex, follow`). Only page 1 of each listing type (unfiltered) and individual post pages are indexable.

### What was shipped

| Deliverable                            | Location                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------- |
| Robots utility                         | `src/lib/seo.ts`                                                           |
| Index listing metadata                 | `src/app/page.tsx` — `generateMetadata` + `searchParams`                   |
| Post metadata (indexable + OG/Twitter) | `src/app/[slug]/page.tsx` — `generateMetadata`                             |
| Excerpt for post descriptions          | `packages/sanity/src/queries.ts` — `POST_BY_SLUG_QUERY` includes `excerpt` |

### `getBlogRobotsDirective()` rules

| Input                                  | `index` | `follow` |
| -------------------------------------- | ------- | -------- |
| `kind: 'post'`                         | `true`  | `true`   |
| Listing, page 1, no filters            | `true`  | `true`   |
| Listing, page ≥ 2                      | `false` | `true`   |
| Listing, any active filter query param | `false` | `true`   |

**Listing kinds:** `blog_index`, `category`, `tag`, `author` (latter three ready for future archive routes).

**Filter query keys** (non-empty value → filtered): `tag`, `category`, `q`, `query`, `author`, `year`, `month`.  
**Not a filter:** `page` (pagination only) — parsed via `parseListingPage()`.

### Routes

| App path        | Public URL (local)    | Robots               |
| --------------- | --------------------- | -------------------- |
| `/`             | `/`                   | From `searchParams`  |
| `/[slug]`       | `/[slug]`             | Always index, follow |
| `[...segments]` | unknown multi-segment | → `notFound()`       |

### Related docs

- `CLAUDE.md` — AEO/GEO metadata contract for post pages.
- `.cursor/rules/blog.mdc` — quick rules for this app.

---

## PROD-1506 — Blog 404 + recovery rail (implemented)

**Jira:** [PROD-1506](https://dotdirect.atlassian.net/browse/PROD-1506) — S2.10 Blog 404 page

**Schema source:** `apps/studio/schemas` (`post`, `blogCategory`, `author.photo`) — not `studio-old` or stub `packages/sanity` post schema.

### What was shipped

| Deliverable                     | Location                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Global 404                      | `src/app/not-found.tsx` — `noindex, follow` via `getBlogRobotsDirective({ kind: 'error' })`               |
| Blog GROQ                       | `packages/sanity/src/queries/blog.ts` — categories + popular posts (month window, `publishedAt` fallback) |
| Data helpers                    | `src/lib/blog-data.ts`, `src/lib/blog-categories.ts` (studio slug fallback)                               |
| Recovery rail (reuse PROD-1503) | `src/app/_components/` — search, chips, popular rail, RFQ CTA, newsletter                                 |
| Newsletter API                  | `src/app/api/newsletter/route.ts` — needs `NEWSLETTER_WEBHOOK_URL`                                        |
| Author image field              | `POST_BY_SLUG_QUERY` uses `author.photo` (studio `author` schema)                                         |

### Popular posts

No `viewCount` on studio `post` yet. Rail uses posts with `publishedAt` in the current UTC month; if fewer than three, fills from latest published.

### Verification

```bash
pnpm dev:blog
curl -sI http://localhost:3003/this-slug-does-not-exist | head -8
# Expect HTTP 404 and robots noindex on HTML (check page source or metadata)
```

### Ops follow-up

- [ ] Set `NEWSLETTER_WEBHOOK_URL` in Vercel when S2.1 webhook is ready
- [ ] Optional `NEXT_PUBLIC_WWW_URL` for quote CTA host
- [x] Full seed: `pnpm --filter @pakfactory/studio run seed` → `development` dataset
- [x] Blog dev supplement: `pnpm seed:blog-dev` → extra posts (3/category) + 5 industries

---

## PROD-1497 — Blog home page (implemented)

**Jira:** [PROD-1497](https://dotdirect.atlassian.net/browse/PROD-1497) — S2.1 Build `/blog` home page

**Schema source:** `apps/studio` — `post.featuredOnHome`, `post.category`, `blogCategory`, `industry`.

### What was shipped

| Deliverable       | Location                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Home page rebuild | `src/app/page.tsx` — hero, industries, 5 category rows, newsletter, pillars, RFQ                |
| Home data + order | `src/lib/blog-home.ts` — category slug order per AC                                             |
| GROQ              | `packages/sanity/src/queries/blog.ts` — featured, latest, by category, industries               |
| Components        | `home-hero`, `home-industry-strip`, `home-category-row`, `home-conversion-pillars`, `post-card` |
| Studio pin field  | `apps/studio/schemas/post.ts` — `featuredOnHome`                                                |
| Blog JSON-LD      | `@pakfactory/seo` — `blog()` generator                                                          |
| Seed              | `featuredOnHome: true` on `post-paperboard-guide`                                               |

### Verify

```bash
pnpm dev:blog
open http://localhost:3003
pnpm build:blog
```

### UI primitives (post-1497)

Marketing bands use `@pakfactory/ui` **`Card`**, **`Button`**, **`Badge`**, **`Input`** — see `CLAUDE.md` Components section. Conversion pillars, newsletter, and RFQ use `Card`; hero/post tiles use layout + `PostCard`.

### Ops follow-up

- [ ] Deploy studio schema (`featuredOnHome`) before editors can pin hero post in production dataset
- [ ] Confirm www industry URLs (`/industries/{slug}`) match marketing routes
- [x] Category archive routes (PROD-1499) — `/category/[slug]`, “View All →” links

---

## Local dev — env, port, Sanity seed (2026-05-25)

### Default port

| Item                      | Value                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| `apps/blog/package.json`  | `next dev --port ${PORT:-3003}`                                    |
| `site.ts` fallback origin | `http://localhost:3003` when `NEXT_PUBLIC_SITE_URL` unset          |
| Public URL                | **`http://localhost:3003/`** (home at root; do not append `/blog`) |

Do not use port **3001** unless you set `PORT=3001` explicitly (another service may already use 3001).

### Environment loading (critical)

The blog app must see Sanity credentials at **runtime**. Three layers work together:

| Layer    | File / config              | Role                                                                               |
| -------- | -------------------------- | ---------------------------------------------------------------------------------- |
| Turbo    | `turbo.json` → `dev.env`   | Declares env keys for hashing only (Turbo does not load `.env` files)              |
| Next     | `apps/blog/next.config.ts` | `loadEnvConfig(repoRoot)` via `import.meta.url` (not `process.cwd()`)              |
| Override | `apps/blog/.env.local`     | Optional; **recommended** copy of `NEXT_PUBLIC_SANITY_*` + `SANITY_API_READ_TOKEN` |

**Studio is different:** `apps/studio/.env.local` is read by Vite only — keep `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` aligned with root (see `apps/studio/.env.example`).

**Symptom:** dev yellow banner — _Project: (missing) · Token: missing · Configured: no_ → blog never loaded root `.env.local`. Fix `apps/blog/.env.local` and restart.

### Sanity dataset (local)

| Setting | Local dev value                                         |
| ------- | ------------------------------------------------------- |
| Project | `8293wrxp` (team project; match root `.env.local`)      |
| Dataset | **`development`** (not `production` for day-to-day dev) |

Root `.env.example` defaults to `development`. Production dataset is for Vercel prod / preview only.

### Content vs seed workflow

**Editorial content does not live in git.** Posts, homepage blocks, topics copy, and SEO fields are stored in the **Sanity dataset** (cloud). Next.js reads them at runtime via GROQ. When the content team edits in Studio, those changes appear on the next page load or Presentation refresh — there is **no pull-into-repo step** before building features.

**Seeding is the opposite direction:** scripts in [`apps/studio/scripts/`](../../apps/studio/scripts/) **push** known fixture documents **into** Sanity using `createOrReplace` on fixed IDs. Use seeds to bootstrap or reset dev data — not to stay in sync with editors.

| Artifact | Source of truth | In git? |
| -------- | --------------- | ------- |
| Schemas (fields, page-builder blocks) | `apps/studio/schemas/` | Yes |
| GROQ queries | `packages/sanity/src/queries/` | Yes |
| Editorial content | Sanity dataset | No |
| Seed fixtures | `seed*.mjs` scripts | Yes (templates only) |

**Developer workflow when content team is editing:**

1. Align `.env.local` to the **same project + dataset** as Studio (`development` for day-to-day dev).
2. Run `pnpm dev:studio` + `pnpm dev:blog` — apps read live data; no seed required.
3. Preview **drafts** via Studio **Presentation** ([`docs/sanity-live-preview.md`](./docs/sanity-live-preview.md)). Direct browser tabs show **published** content unless draft mode is on.
4. **Do not run seed scripts** on a dataset editors are actively using unless you intend to overwrite fixed docs (`blogHomePage`, `blogTopicsPage`, `post-dev-*`, etc.).
5. **Schema changes** ship from git first; editors fill new fields in Studio after deploy.

**Rare “pull” (dataset export/import):** Sanity CLI `sanity dataset export` / `import` — for backup, cloning prod → staging, or disaster recovery. Not wired in this repo; not part of daily dev. Do not commit `.tar.gz` exports for normal feature work.

**Rules of thumb:** same dataset in env as Studio → latest published content on refresh; seeding ≠ syncing; never seed `production` without ops approval.

**AI agents:** schema changes in git only; never run seeds or write documents in Sanity on any dataset. Content team and developers run seeds and Studio edits manually when needed ([`AGENTS.md`](../../AGENTS.md) § Sanity content — agent guardrails).

### Seed commands

| Command                                     | What it writes                                                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @pakfactory/studio run seed` | Full catalog (~163 docs): capabilities, products, blog taxonomy, 3 base posts, settings. Idempotent `createOrReplace`. Reads root `.env.local`. |
| `pnpm seed:blog-dev`                        | Supplement: 12 extra posts (≥3 per category for home rows) + 5 industries + nav + home/topics defaults. **Overwrites** singletons. Script: `apps/studio/scripts/seed-blog-dev.mjs`. |
| `pnpm --filter @pakfactory/studio run seed:blog-singleton-pages` | Home + topics page builders only (`blogHomePage`, `blogTopicsPage`). **No post changes.** Script: `apps/studio/scripts/seed-blog-singleton-pages.mjs`. |

Token: `SANITY_API_WRITE_TOKEN`, `SANITY_TOKEN`, or `SANITY_API_READ_TOKEN` (repo scripts accept any of these for local dev).

After seeding, refresh Studio (`pnpm dev:studio`) and blog home.

### Troubleshooting empty home page

1. Open **`http://localhost:3003`** (not `:3001`, not `localhost:3000`).
2. Confirm banner shows **Project: `8293wrxp`**, **Token: set**, **Configured: yes**.
3. If not: sync env into `apps/blog/.env.local` from root (see `apps/blog/.env.example`).
4. Stop dev server → `rm -rf apps/blog/.next` → `pnpm dev:blog`.
5. Re-run seeds on dataset **`development`** if categories/posts are empty in Studio.
6. Watch terminal for `[blog-home] … failed:` (dev-only GROQ error logs).

### Dev-only home diagnostics

| Item                      | Location                                          |
| ------------------------- | ------------------------------------------------- |
| Yellow empty-state banner | `page.tsx` when zero posts in development         |
| `noStore()` in dev        | `blog-home.ts` — avoids stale empty RSC cache     |
| `getBlogHomeDebugInfo()`  | `blog-home.ts` — project/dataset/token for banner |

Remove or narrow the banner once local CMS connection is stable.

---

## PROD-1499 — Category archives (`/category/[slug]`)

**Jira:** [PROD-1499](https://dotdirect.atlassian.net/browse/PROD-1499) — S2.3 Category landing pages — **Request For Approval** (2026-05-19)

| Deliverable       | Location                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Page 1            | `src/app/category/[slug]/page.tsx`                                                                           |
| Page 2+           | `src/app/category/[slug]/page/[n]/page.tsx`                                                                  |
| Post detail       | `src/app/category/[slug]/[postSlug]/page.tsx`                                                                |
| Post URLs         | `src/lib/blog-post-url.ts` (`postDetailHref`)                                                                |
| Shared post logic | `src/lib/blog-post.ts`, `blog-post-article.tsx`                                                              |
| Data              | `src/lib/blog-category-archive.ts`                                                                           |
| JSON-LD           | `src/lib/category-archive-jsonld.ts`                                                                         |
| UI                | `category-archive-view`, `category-filter-sidebar`, `category-active-filters`, `PostCard` `headline` variant |

**QA (post URL bugfix):** From `/category/business-strategy`, cards link to `/category/business-strategy/{postSlug}` (not `/{postSlug}`). Legacy `/{postSlug}` redirects when category is known.

```bash
open http://localhost:3003/category/packaging-news
open http://localhost:3003/category/business-strategy/tco-folding-cartons-vs-rigid
open http://localhost:3003/category/trends?tag=some-tag
```

---

## PROD-1498 — All posts archive (`/all`)

**Jira:** [PROD-1498](https://dotdirect.atlassian.net/browse/PROD-1498) — S2.2 All posts archive with pagination

| Deliverable | Location                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------- |
| Page 1      | `src/app/all/page.tsx`                                                                      |
| Page 2+     | `src/app/all/page/[n]/page.tsx`                                                             |
| Data        | `src/lib/blog-archive.ts`                                                                   |
| JSON-LD     | `src/lib/all-archive-jsonld.ts`                                                             |
| UI          | `_components/all-posts-archive.tsx`, `archive-filter-sidebar.tsx`, `archive-pagination.tsx` |

```bash
open http://localhost:3003/all
curl -sI http://localhost:3003/all/page/99 | head -5  # expect 404 when out of range
```

---

## PROD-1505 — RSS feed (`/rss.xml`)

**Jira:** [PROD-1505](https://dotdirect.atlassian.net/browse/PROD-1505) — S2.9 Build RSS feed

| Deliverable       | Location                                                 |
| ----------------- | -------------------------------------------------------- |
| Route handler     | `src/app/rss.xml/route.ts`                               |
| XML builder       | `src/lib/rss.ts`                                         |
| GROQ              | `BLOG_RSS_POSTS_QUERY` in `@pakfactory/sanity/queries`   |
| Autodiscovery     | `src/app/layout.tsx` → `metadata.alternates.types`       |
| Shared revalidate | `src/lib/blog-cache.ts` (`BLOG_REVALIDATE_SECONDS = 60`) |

```bash
curl -s http://localhost:3003/rss.xml | head -20
curl -sI http://localhost:3003/rss.xml | grep -i content-type
```

## Full-bleed page-builder — dashed border toggles

Full-bleed blocks (`postFeaturedRow`, `postCategoryRow`, `postPopularRow`, `postSpotlightRow`, `ctaNewsletter`) expose **Show top dashed border** and **Show bottom dashed border** in Studio (`apps/studio/lib/dieline-border-fields.ts`). Both default **on** for new inserts; editors turn one off when stacked blocks would show a double dash.

**Legacy documents** without saved border fields keep prior behavior: post rows render bottom only; newsletter CTA renders top only (`apps/blog/src/lib/dieline-borders.ts`).

**Topics page double-line fix (human-only):** On **Pages → Topic page → Page builder**, when `postPopularRow` sits directly above `ctaNewsletter`, hide one adjacent border — e.g. turn **off** `showTopBorder` on the newsletter block, or **off** `showBottomBorder` on the popular row above it.

## Archive listing pagination

- **Page size:** `LISTING_PAGE_SIZE = 15` in `src/lib/blog-archive.ts` (topic, category, `/all` archives).
- **UI:** shared `src/components/modules/pagination.tsx` — Figma Topic Detail layout (status left, Previous + numbered window + Next right). Window helper: `src/lib/pagination-window.ts`.
- **Routes:** page 1 at list root; page 2+ at `/page/{n}` (e.g. `/topics/{slug}/page/2`). Pager hidden when `totalPages <= 1`.

## Topic groups — `blogTopicGroup` + `topicGroup` ref (CMS taxonomy)

Tags stay **flat** (`blogTag`, URL `/topics/{slug}`). Grouping for Studio and the `/topics` grid uses **`blogTopicGroup`** documents; each tag holds a **`topicGroup`** reference.

| Concern | Location |
| ------- | -------- |
| **Source of truth** — group vocabulary | `blogTopicGroup` in `apps/studio/schemas/blogTopicGroup.ts` |
| Tag → group reference | `topicGroup` on `apps/studio/schemas/blogTag.ts` |
| Studio browse — panel 2: group folders \| divider \| Edit groups \| Ungrouped; panel 3: topics (folder), group CRUD (Edit groups), or ungrouped topics | `apps/studio/structure/index.ts` (`topicsDeskItem`) |
| Seeded groups + tag assignments | `apps/studio/scripts/seed.mjs` (`blogTopicGroups`, `blogTags`) |
| `/topics` grid (listed only) | Topic page Overview `topics[]` (references to `blogTopicGroup`); publish prepends new groups — [`publishTopicGroupToTopicsPage`](../../apps/studio/actions/publishTopicGroupToTopicsPage.ts) |
| `/topics` page GROQ | `BLOG_TOPICS_PAGE_BUILDER_QUERY` (hydrates `topics[]` + `pageBuilder`) in `@pakfactory/sanity/queries` |
| Front-end grid | `src/lib/blog-topics-index.ts` (`fetchTopicsIndex(pageTopics)` — no auto-append), `src/components/modules/topic-grid.tsx` |
| Tag links per group | All assigned `blogTag` docs with a slug (same as Studio group folder); not gated on published posts |
| Group title helper | `topicGroupTitle()` in `src/lib/tag-groups.ts` |
| Facet projection | `BLOG_CATEGORY_TAGS_FACET_QUERY`; type `CategoryFacetTag` in `src/lib/blog-category-archive.ts` |

**To add/rename a group:** create or edit a `blogTopicGroup` in Studio (or seed). Assign tags via `topicGroup` ref. **Publish** the group to prepend it on **Pages → Topic page → Overview → Topics**; only listed groups render on `/topics` (group headings show even with zero topic links). Drag to reorder. Do not change group slugs after tags use them (`?group=` deep links).

**Existing groups (migration):** re-publish each `blogTopicGroup`, manually add references on the Topic page `topics` list, or run seed — until listed, groups do not appear on `/topics`. After the reference-array schema change, replace any legacy `topicsGridItem` rows by re-adding groups on Overview → Topics.

### Human migration (existing datasets)

After schema deploy, content team must:

1. Create `blogTopicGroup` docs (Material, Packaging Type, Finish, Industry, …).
2. Re-assign each `blogTag` to its group in Studio.
3. Remove legacy `tagGroup` string and unknown `axis` fields from existing documents.
4. Verify `/topics`, `/topics?group=industry`, home industry pills, tag archive kickers.

Agents implement schema + queries + UI only — **do not run seeds or patch production documents.**

**Gotcha:** `S.documentTypeList('blogTag').filter(...)` **replaces** the built-in `_type`
constraint, so every custom tag filter in `structure/index.ts` must include `_type == "blogTag"`
explicitly (else it matches all types and breaks orderings — e.g. `author` has no `title`).

---

## PROD-1596 — Centralize blog URL base (subpath readiness)

**Jira:** [PROD-1596](https://dotdirect.atlassian.net/browse/PROD-1596) — Centralize blog URL base for subpath readiness — child of PROD-1482 (Blog App Routes)

**Why:** Product direction is to host the blog at **`pakfactory.com/blog`** (subpath; `www` at root) via Next.js **multi-zones**, while keeping origin-root/subdomain working today. `basePath` prefixes `next/link` + framework assets but **not** hand-built absolute URLs, so canonicals/JSON-LD/RSS would emit wrong paths under `/blog`. One source of truth makes the flip a config change.

### What was shipped

| Deliverable                                                         | Location                                                                                                               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `BLOG_BASE_PATH` + `absoluteUrl()` / `siteBaseUrl()` / `sitePath()` | `src/lib/site.ts`                                                                                                      |
| Canonicals + OG via helper                                          | `app/page.tsx`, `app/all/page.tsx`, `app/all/page/[n]`, `app/category/[slug]/page.tsx`, `app/category/[slug]/page/[n]` |
| JSON-LD via helper                                                  | `lib/category-archive-jsonld.ts`, `lib/all-archive-jsonld.ts`, `lib/blog-post.ts` (post + breadcrumbs)                 |
| RSS channel/item links                                              | `app/rss.xml/route.ts` passes `siteBaseUrl()`; `lib/rss.ts` unchanged                                                  |
| RSS autodiscovery (relative)                                        | `app/layout.tsx` → `sitePath("/rss.xml")`                                                                              |
| **New** XML sitemap                                                 | `app/sitemap.ts` (+ `BLOG_SITEMAP_POSTS_QUERY` in `@pakfactory/sanity/queries`)                                        |
| Env docs                                                            | root + `apps/blog/.env.example` → `NEXT_PUBLIC_BLOG_BASE_PATH`                                                         |

### Contract

- **`NEXT_PUBLIC_SITE_URL` = origin only** (scheme + host, no path).
- Build absolute URLs **only** via `absoluteUrl(path)`; relative metadata `url`s via `sitePath(path)`. Never `${getSiteUrl()}${path}`.
- Routes stay **flat** at app root — the `/blog` prefix is `basePath`, never an `app/blog/` folder.

### The flip (when www multi-zone lands — out of scope here)

1. `next.config.ts`: `basePath: '/blog'` (+ `assetPrefix` if zones are separate deployments).
2. Env: `NEXT_PUBLIC_BLOG_BASE_PATH=/blog`.
3. `apps/www`: rewrite `/blog/*` → blog zone.
4. Result: `next/link`, canonicals, JSON-LD, RSS, and `/blog/sitemap.xml` all gain `/blog` automatically.

### Verification

```bash
pnpm --filter @pakfactory/blog typecheck && pnpm build:blog
# Default (no env): origin-root, byte-identical to pre-PROD-1596 output.
curl -s http://localhost:3003/sitemap.xml | head -20
# With NEXT_PUBLIC_BLOG_BASE_PATH=/blog set: every <loc>/<link>/canonical gains /blog
# (verified against the running dev server — sitemap, RSS, and canonicals all prefixed).
```

---

## PROD-1500 — Tag archives (`/tag/[slug]`)

**Jira:** [PROD-1500](https://dotdirect.atlassian.net/browse/PROD-1500) — S2.4 Build `/blog/tag/[slug]` tag pages — child of PROD-1482

**Schema:** flat `blogTag` (`title`, `slug`, `topicGroup` ref, `description`, `meta*`, `ogImage`); `post.tags[]->blogTag`. Group labels from `blogTopicGroup` (see [Topic groups](#topic-groups--blogtopicgroup--topicgroup-ref-cms-taxonomy) section).

### What was shipped

| Deliverable                                 | Location                                                                                                                                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page 1                                      | `src/app/tag/[slug]/page.tsx`                                                                                                                                                                  |
| Page 2+ (`/page/1` → `/tag/[slug]`)         | `src/app/tag/[slug]/page/[n]/page.tsx`                                                                                                                                                         |
| Data                                        | `src/lib/blog-tag-archive.ts`                                                                                                                                                                  |
| Group title helper | `topicGroupTitle()` in `src/lib/tag-groups.ts` |
| JSON-LD                                     | `src/lib/tag-archive-jsonld.ts`                                                                                                                                                                |
| Robots (empty→noindex)                      | `getTagListingRobots()` in `src/lib/seo.ts`                                                                                                                                                    |
| UI                                          | `_components/tag-archive-view`, `tag-filter-sidebar`, `tag-active-filters`, `tag-archive-pagination`; reuse `PostCard`                                                                         |
| GROQ                                        | `BLOG_TAG_BY_SLUG_QUERY`, `BLOG_TAG_POSTS_{COUNT,PAGE_NEWEST,PAGE_OLDEST,PAGE_TITLE}_QUERY`, `BLOG_TAG_COOCCURRING_TAGS_QUERY`, `BLOG_TAG_AUTHORS_FACET_QUERY` in `@pakfactory/sanity/queries` |

### Behavior

- **Kicker:** `topicGroupTitle(tag.topicGroup)` → e.g. `Industry`; omitted when ungrouped.
- **Sidebar:** co-occurring tags (other tags on this tag's posts) grouped by `topicGroup`; **the current tag's own group row is hidden**; empty groups omitted. Plus author + date + sort. Filter state (`author`, `year`, `month`, `sort`) in URL — **`tag` is the page, not a filter**.
- **Robots:** page 1 unfiltered **with ≥1 post → index, follow**; **empty tag / page ≥2 / any filter → noindex, follow**. The empty→noindex clause is unique to tags (`getTagListingRobots`).
- **Posts** span categories; each `PostCard` links via its own `post.categorySlug` (`/{category}/{post}`).
- **Unknown tag slug → `notFound()`**; out-of-range page → `notFound()`.

### Verification (against running dev server)

```bash
pnpm --filter @pakfactory/blog typecheck && pnpm build:blog
curl -sI -o /dev/null -w "%{http_code}" http://localhost:3003/tag/sustainability   # 200
curl -s http://localhost:3003/tag/does-not-exist | head -1                          # 404 page
curl -s http://localhost:3003/tag/foil-stamp | grep robots                          # noindex (0 posts)
curl -s 'http://localhost:3003/tag/sustainability?year=2099' | grep robots          # noindex (filtered)
curl -s http://localhost:3003/tag/beauty | grep -i 'tracking-wide'                  # kicker "Industry"
```

---

## PROD-1597 — Blog URL scheme: no `/category/` prefix; posts canonical at `/{slug}`

**Jira:** [PROD-1597](https://dotdirect.atlassian.net/browse/PROD-1597) — requirement update for PROD-1499. **Rescoped 2026-05-27** (see [[post-url-is-always-root-slug]]).

**Scheme:** category archives at `/{category}`; a post's **only** URL is `/{slug}` (root). Category/tag/search/home are discovery paths, never URL scoping. The first implementation made posts `/{category}/{post-slug}`; that was reverted — bare-root post is now canonical, scoped URL 301s to it.

| Concern                       | Location                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Root resolver                 | `src/app/[category]/page.tsx` — known category slug → archive; else → post by slug (`/{slug}`); else `notFound()`                           |
| Category pagination           | `[category]/page/[n]/` (unchanged)                                                                                                          |
| Legacy scoped post → redirect | `[category]/[postSlug]/page.tsx` — `permanentRedirect('/'+postSlug)` (308), guarded to known categories                                     |
| URL builders                  | `categoryHref(slug)` → `/{category}`, `tagHref(slug)` → `/tag/{slug}`, `postDetailHref(slug)` → **`/{slug}`** in `src/lib/blog-post-url.ts` |
| Redirects                     | `next.config.ts` `redirects()` — `/category/:c` → `/:c`, `…/page/:n` → `/:c/page/:n`, `/category/:c/:post` → **`/:post`** (permanent)       |

**Guards:** unknown/reserved single segments → `notFound()` (static routes `/all`, `/tag`, `/rss.xml`, `/sitemap.xml`, `/api` win over the dynamic segment). A post slug must never equal a category slug or reserved segment — recommend Studio validation (follow-up).

**Derived surfaces auto-update** via `postDetailHref` → `/{slug}`: canonicals, breadcrumb/collection JSON-LD (breadcrumb still shows category context), RSS `<link>`, sitemap. All absolute via `absoluteUrl()`.

### Verification

```bash
pnpm --filter @pakfactory/blog typecheck && pnpm build:blog
# /{slug} → 200 (canonical /blog/{slug}); /{category}/{slug} → 308 → /{slug};
# /{category} archive → 200; unknown → 404; sitemap/RSS/cards emit /{slug}.
```

### Also (home) — Browse by Industries from the industry tag group

`home-industry-strip` + `blog-home.ts` now source industry pills from `BLOG_INDUSTRY_TAGS_QUERY` (`blogTag` where `topicGroup->slug.current == "industry"`) and link to `/topics/{slug}` via `tagHref()` — replacing the old `industry`-doc query + hardcoded fallback + www links.

---

## PROD-1501 — Author profile pages (`/author/[slug]`)

**Jira:** [PROD-1501](https://dotdirect.atlassian.net/browse/PROD-1501) — S2.5, child of PROD-1482.

**Schema:** `author` (name, slug, photo, role, bio[PT], credentials[PT], linkedIn). Per AC only **LinkedIn** is rendered (personalSite/xHandle ignored).

| Deliverable          | Location                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Page                 | `src/app/author/[slug]/page.tsx` — indexable, Person JSON-LD, SSR first 12                                                       |
| Load More API        | `src/app/api/author/[slug]/posts/route.ts` — `?offset=`, 12/page, server-resolved `imageUrl`                                     |
| Data                 | `src/lib/blog-author.ts` (`AUTHOR_PAGE_SIZE=12`, `fetchAuthorPostsPage`, client-safe `AuthorPostCard`)                           |
| JSON-LD              | `src/lib/author-jsonld.ts` — `Person` + `sameAs`→LinkedIn + breadcrumb; `authorPersonId(slug)` shared                            |
| PT renderer          | `_components/portable-text.tsx` (`@portabletext/react`, added as blog dep)                                                       |
| UI                   | `_components/author-header.tsx` (photo/role/H1/bio/credentials/LinkedIn), `_components/author-posts-loader.tsx` (`"use client"`) |
| Person schema fields | `packages/seo` `person()` extended: `jobTitle`, `description`, `sameAs[]`                                                        |
| Article back-ref     | `blog-post.ts` — post `Article.author` `@id` = `authorPersonId(slug)` (author page node)                                         |
| Sitemap              | `AUTHORS_FOR_SITEMAP_QUERY` → author URLs in `sitemap.ts`                                                                        |

**Load More pattern:** SSR renders first 12; the client loader appends via `fetch('/api/author/{slug}/posts?offset=N')` — **no `/page/N` URLs**. The client grid imports `AuthorPostCard` as a **type-only** import so it never pulls the `server-only` `sanity-image` builder; the API/page resolve `imageUrl` server-side.

### Verification

```bash
pnpm --filter @pakfactory/blog typecheck && pnpm build:blog
# /author/marcus-wright → 200, robots index,follow, Person JSON-LD w/ sameAs (LinkedIn).
# A post by that author: Article.author @id == /blog/author/{slug}#person.
# /api/author/{slug}/posts?offset=12 → {posts, hasMore}; unknown author → 404.
```

---

## PROD-1602 — CMS redirects (auto slug-change → 301, no deploy)

**Jira:** [PROD-1602](https://dotdirect.atlassian.net/browse/PROD-1602) — T1.7, child of PROD-1601 (content-team Studio fields). Split across two branches: Studio side on `feature/sanity-studio-ux` (`9f9acea`), blog side on `feature/blog` (`b1fb80c`). WordPress "Redirection plugin" analogue — changing a published post slug auto-creates a 301; the old URL redirects within the cache window with **no deploy**.

### Blog side (this branch)

| Deliverable           | Location                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Active-redirect GROQ  | `BLOG_REDIRECTS_QUERY` in `@pakfactory/sanity/queries`                                                                                                       |
| Cached map + resolver | `src/lib/blog-redirects.ts` — `unstable_cache` (60s TTL + `blog-redirects` tag), `resolveRedirect` (bounded chain-follow + loop guard), `redirectOrNotFound` |
| Resolver hook         | `src/app/[category]/page.tsx` — redirect check before `notFound()`                                                                                           |
| Catch-all hook        | `src/app/[...segments]/page.tsx` — multi-segment legacy URLs                                                                                                 |
| Webhook               | `src/app/api/revalidate/route.ts` — secret-validated → `revalidateTag` on redirect/post                                                                      |
| Cache tag             | `BLOG_REDIRECTS_CACHE_TAG` in `src/lib/blog-cache.ts`                                                                                                        |

### Studio side (`feature/sanity-studio-ux`)

`redirect` document (`from`/`to`/`type`/`notes`/`isActive`, unique-`from` + no-self-redirect), Redirects desk list, and the `publishWithRedirect` action (idempotent create, chain collapse, deletes rows whose source becomes the new live path → no self-loops).

### Status codes (Next 16)

CMS stores `301`/`302`; apply maps **301 → 308** (`permanentRedirect`) / **302 → 307** (`redirect`) — a Server Component can only emit 307/308, and 308 is SEO-equivalent to 301. `revalidateTag` now requires `(tag, profile)`; the **60s `unstable_cache` TTL is the freshness floor**, the webhook is best-effort instant invalidation.

### Cost

Redirect lookup runs **only on would-be-404s** (zero cost on valid pages); Sanity is read once per cache window, never per request.

### Ops follow-ups

- Set `SANITY_REVALIDATE_SECRET`; configure a Sanity webhook (`8293wrxp`) → `POST /api/revalidate` filtered `_type == "redirect" || _type == "post"`.
- `sanity deploy` so the team Studio gets the schema + publish action.

### Verification (live, 8293wrxp/development)

```bash
# create redirect /legacy-redirect-test → /all (type 301), then:
curl -sI http://localhost:3003/legacy-redirect-test   # 308 → /all
curl -sI http://localhost:3003/unknown-xyz            # 404
curl -sI http://localhost:3003/trends                 # 200 (live page, no cost)
```

## PROD-1609 — Component architecture: schema-grouped shared components (implemented)

**Jira:** [PROD-1609](https://dotdirect.atlassian.net/browse/PROD-1609) — Request For Approval. Supersedes the original "move components into `app/_components/`" and the interim by-area-bucket plans.

### Final structure

```
apps/blog/src/
├─ app/                       routes; route-private UI in app/<route>/_components/
├─ components/                cross-page SHARED only, grouped by the Sanity schema rendered
│  ├─ post/      post-card, post-popular-rail
│  ├─ category/  category-chips, category-posts-row
│  ├─ tag/       tag-strip
│  └─ (root)     pagination, active-filters, filter-sidebar, search-form,
│                breadcrumb, portable-text, rfq-cta, newsletter-cta-band   ← generic / no schema
└─ lib/          everything non-visual (incl. lib/sanity/{client,env})
```

### Conventions (binding — see `CLAUDE.md` § Components and files + management-root rules)

- **`src/` = `app/ components/ lib/` only** (`clean-src-structure`). Sanity client/env live at `lib/sanity/`, not `src/sanity/`.
- **Group shared components by the schema they render**, named `{schema}-{component}` (`post/post-card`); generic/schema-less components stay flat at the `components/` root, role-named. Folder reflects the **data model**, never the route (`category-chips` is in `category/` though only used on 404).
- **Colocate single-route components** in `app/<route>/_components/` (`hero`, `archive-view`, `blog-post-article`, `author-header`, `posts-loader`, the `/all` browse-nav). Colocated files keep role names (the `{schema}-{component}` rule is for the shared set).
- **Bias to shared / design-for-reuse:** promote to `components/` when the design (the Eric/Marketing blog wireframe) shows cross-page use — don't wait for a literal 2nd import. Generalize route coupling to callbacks (`pagination.hrefForPage`, `active-filters.hrefFor`, `filter-sidebar.facetHref` + form actions).

### Notable decisions

- **filter-sidebar** unified into one route-agnostic shared component (category now, search next). **Tag archives dropped the sidebar** (wireframe: tag pages are unfiltered) → full-width grid.
- **tag-strip** is generic (prop `tags`); "industry" is just the `industry` tag group — home feeds it the industry-axis tags as "Browse by Industries".
- **breadcrumb** added (shared) replacing the ad-hoc "← Blog home" links on listing pages; currently roots at `Blog` (→ `/`).
- **category-posts-row** (a category's post grid) renamed from `category-row` to disambiguate from **category-chips** (category links).
- **post-popular-rail** renamed from `popular-posts-rail` for schema-first naming.

### Commits (branch `feature/blog`)

| SHA       | What                                                                                     |
| --------- | ---------------------------------------------------------------------------------------- |
| `159ef27` | move Sanity client/env → `src/lib/sanity`                                                |
| `04d1cfa` | components by reusability — colocate page-specific, merge pagination/active-filters      |
| `12688a6` | wire workspace rules; supersede PROD-1609 layout                                         |
| `4ddc5e8` | promote shared per wireframe (category-row, tag-strip, filter-sidebar); drop tag sidebar |
| `6a1a0a2` | generic tag-strip + shared Breadcrumb; rename → category-posts-row                       |
| `7712623` | group shared components by schema (`{schema}-{component}`)                               |

### Follow-ups (not done)

- Generic shared pieces the wireframe implies but we haven't built: blog-detail widgets (TOC, TL;DR, FAQ, comparison-table, chart, stat-callout, citations, author-bio-box), the Contribute pitch form, a featured-post hero. Add `breadcrumb` to detail/author/contribute once built; optionally add a www "Home" crumb for a full trail.
- Colocated components don't follow `{schema}-{component}` (intentional — that rule is for the shared set); revisit only if a convention for colocated names is wanted.

## PROD-1775 — Studio Presentation / visual editing on the deployed Vercel staging (in progress)

**Jira:** [PROD-1775](https://dotdirect.atlassian.net/browse/PROD-1775) — bug. **Goal:** the deployed Studio's Preview tab loads the deployed blog (`https://pakfactory-blog.vercel.app`) with working visual-editing overlays + "documents on this page", matching local dev.

### Shipped

| Concern | Where / value |
| --- | --- |
| **CORS** | `https://pakfactory-blog.vercel.app` added to project `8293wrxp` (allow credentials). **Admin-only** — the robot deploy/editor/viewer tokens all lack the `sanity.project.cors` grant (verified: all 401). |
| **Studio preview origin** | `apps/studio/.env.production` (committed, public `SANITY_STUDIO_*` only) → `SANITY_STUDIO_PREVIEW_URL_BLOG=https://pakfactory-blog.vercel.app`. Vite **production** builds (`sanity build`/`deploy`) load `.env.production` over `.env.local` (verified Vite 7.3.2: `.env.[mode]` > `.env.local`); `sanity dev` keeps localhost. **Deploy trap:** `source`ing `.env.local` for the token injects `…=http://localhost:3003` into the shell, which beats `.env.production` (shell var wins) → bakes localhost. Extract only the token. |
| **Draft-aware render** | `fetchBlogHomePageBuilder()` → **`getPreviewableSanityClient()`** (commit `6d9068d`). |
| **Studio host** | now **`pakfactory.sanity.studio`** (appId `wzfe5kfkev9dwchv1b07110h`, commit `dafb66e`). Old `pakfactory` (project `ix8fju7k`, appId `dyspvqz55…`) undeployed; `pakfactory-2` removed. |
| **Vercel env (staging)** | `SANITY_API_READ_TOKEN` set (required by `/api/draft-mode/enable`); dataset `development` (matches the Studio's edited dataset). |

### Root cause of "No matching documents" / no overlays on deployed

Presentation discovers documents + draws overlays from **stega-encoded content**, which `getSanityClient()` emits only under the `drafts` perspective. In **dev** that's automatic (`useDraftsInDev`); in **production** it's published / no-stega. Only `blog-post.ts` used the previewable client (pre-existing, commit `46efab4`), so every other deployed route — including the page-builder home — rendered with no stega → Presentation had nothing to resolve. Fix = route preview-relevant fetches through `getPreviewableSanityClient()` (drafts+stega under draft mode, published otherwise — **anonymous traffic unchanged**; components are presentational so stega rides in the fetched strings, no page/component edits).

### Remaining — the other 7 libs (NOT done; rollout paused)

Still on the published client → not editable in Presentation: `blog-page`, `blog-category-archive`, `blog-tag-archive`, `blog-author`, `blog-archive`, `blog-search`, `blog-data`. **Skip `blog-redirects`** (runs inside `unstable_cache`, where `draftMode()` is illegal). Pattern: resolve `const client = await getPreviewableSanityClient()` once per fetcher (functions already `async`), replace `getSanityClient()`.

### Known fragility — third-party cookies (the real blocker)

Studio (`pakfactory.sanity.studio` → **302 → `www.sanity.io/@or35qxDdx/studio/<appId>`**) is **cross-site** with `pakfactory-blog.vercel.app`. Visual editing needs Next's `__prerender_bypass` draft cookie (Next correctly sets it `SameSite=None; Secure` in prod), but browsers block third-party cookies — so preview dies whenever the manual "allow third-party cookies" exception resets (recurred overnight 2026-06-17). The `*.sanity.studio` → `www.sanity.io` redirect is **intrinsic to CLI v6 hosting** and not avoidable; renaming the host does not change it.

**Permanent fix (recommended, ADR candidate):** make Studio + blog **same-site** — self-host Studio at `studio.pakfactory.com` + serve blog at `blog.pakfactory.com` (both under `pakfactory.com`) → draft cookie first-party → preview works in every browser. Alternative: embed Studio in the Next app at `/studio` (same-origin).
