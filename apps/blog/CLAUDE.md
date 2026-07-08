# CLAUDE.md — `@pakfactory/blog`

Inherits root [`CLAUDE.md`](../../CLAUDE.md) and [`AGENTS.md`](../../AGENTS.md). This file adds **blog-app** conventions only.

## Routes (Next.js App Router)

| Route                      | File                                                                                         | Notes                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/`                        | [`src/app/page.tsx`](./src/app/page.tsx)                                                     | Blog home; `BlockRenderer` + home singleton `pageBuilder`; `revalidate = 60`                       |
| `/all`                     | [`src/app/all/page.tsx`](./src/app/all/page.tsx)                                             | All posts archive page 1 (PROD-1498)                                                                                    |
| `/all/page/[n]`            | [`src/app/all/page/[n]/page.tsx`](./src/app/all/page/[n]/page.tsx)                           | Archive pagination; page 1 → `/all`                                                                                     |
| `/rss.xml`                 | [`src/app/rss.xml/route.ts`](./src/app/rss.xml/route.ts)                                     | RSS 2.0                                                                                                                 |
| `/sitemap.xml`             | [`src/app/sitemap.xml/route.ts`](./src/app/sitemap.xml/route.ts)                             | Sitemap index (PROD-1865); lists all sub-sitemaps; `revalidate = 300`                                                   |
| `/pages-sitemap.xml`       | [`src/app/pages-sitemap.xml/route.ts`](./src/app/pages-sitemap.xml/route.ts)                 | Non-post indexable pages: `/`, `/all` (posts archive index), `/contribute`, + CMS landing/static pages                  |
| `/categories-sitemap.xml`  | [`src/app/categories-sitemap.xml/route.ts`](./src/app/categories-sitemap.xml/route.ts)       | All published categories                                                                                                |
| `/authors-sitemap.xml`     | [`src/app/authors-sitemap.xml/route.ts`](./src/app/authors-sitemap.xml/route.ts)             | Authors with ≥1 published post                                                                                          |
| `/posts-sitemap`           | [`src/app/posts-sitemap/route.ts`](./src/app/posts-sitemap/route.ts)                         | 301 → `/posts-sitemap-1.xml`                                                                                            |
| `/posts-sitemap-[n].xml`   | [`src/app/posts-sitemap/[page]/route.ts`](./src/app/posts-sitemap/%5Bpage%5D/route.ts)       | Paginated **post URLs only** (200/group) + featured-image sitemap. Public `-[n].xml` (rewrite in `next.config.ts`) → handler; internal `/posts-sitemap/[n]` still accepted |
| `/topics-sitemap`            | [`src/app/topics-sitemap/route.ts`](./src/app/topics-sitemap/route.ts)                           | 301 → `/topics-sitemap-1.xml`                                                                                             |
| `/topics-sitemap-[n].xml`    | [`src/app/topics-sitemap/[page]/route.ts`](./src/app/topics-sitemap/%5Bpage%5D/route.ts)         | Paginated topics with ≥1 post (200/group). Public `-[n].xml` (rewrite) → handler; internal `/topics-sitemap/[n]` still accepted. Legacy `/tags-sitemap*` → 301 |
| `/search`                  | [`src/app/search/page.tsx`](./src/app/search/page.tsx)                                       | Keyword search (PROD-1503); Sanity `match`, relevance default; always `noindex, follow`; `?q=&page=&year=&month=&sort=` |
| `/contribute`              | [`src/app/contribute/page.tsx`](./src/app/contribute/page.tsx)                               | Contributor pitch form (PROD-1504); **index, follow**; `WebPage` JSON-LD; POST `/api/contribute`                        |
| `/[category]`              | [`src/app/[category]/page.tsx`](./src/app/%5Bcategory%5D/page.tsx)                           | **Resolver:** category archive → **CMS landing/static** (`blogPage`) → post `/{slug}` (ADR-009) |
| `/[category]/page/[n]`     | [`src/app/[category]/page/[n]/page.tsx`](./src/app/%5Bcategory%5D/page/%5Bn%5D/page.tsx)     | Category pagination + query filters                                                                                     |
| `/[category]/[postSlug]`   | [`src/app/[category]/[postSlug]/page.tsx`](./src/app/%5Bcategory%5D/%5BpostSlug%5D/page.tsx) | **Legacy scoped post** → permanent redirect to `/{postSlug}` (PROD-1597)                                                |
| `/topics`                  | [`src/app/topics/page.tsx`](./src/app/topics/page.tsx)                                       | Explore topics index — taxonomy grid (code) + CMS `pageBuilder` below; singleton `blogTopicsPage` (`pageRole: topics`); Overview title + description; `?group=<axis>` expands one axis (noindex) |
| `/topics/[slug]`           | [`src/app/topics/[slug]/page.tsx`](./src/app/topics/%5Bslug%5D/page.tsx)                     | Topic archive page 1 (PROD-1500); axis-aware kicker + sidebar                                                             |
| `/topics/[slug]/page/[n]`  | [`src/app/topics/[slug]/page/[n]/page.tsx`](./src/app/topics/%5Bslug%5D/page/%5Bn%5D/page.tsx) | Topic pagination + filters; page 1 → `/topics/[slug]`; legacy `/tag/*` → 301 here                                        |
| `/author/[slug]`           | [`src/app/author/[slug]/page.tsx`](./src/app/author/%5Bslug%5D/page.tsx)                     | Author profile page 1 (PROD-1501); SSR `PostList` + `Pagination`, Person JSON-LD |
| `/author/[slug]/page/[n]`  | [`src/app/author/[slug]/page/[n]/page.tsx`](./src/app/author/%5Bslug%5D/page/%5Bn%5D/page.tsx) | Author pagination; page 1 → `/author/[slug]`; 15 posts/page                     |

**URL scheme (PROD-1597, updated 2026-05-27):** no `/category/` prefix. A **post's only URL is `/{slug}`** (root) — category/topic/search/home are _discovery paths_, never URL scoping. The root dynamic route `/[category]` resolves to a category archive (known slug), CMS landing/static page, or post via `resolveBlogSegment()`. Legacy `/{category}/{post-slug}` and `/category/...` URLs **permanently redirect** (route-level `permanentRedirect` + `next.config.ts`). Legacy `/tag/{slug}` and `/tag/{slug}/page/{n}` **301 to `/topics/{slug}`** (same pagination shape). Build category links with `categoryHref()`, topic links with `tagHref()` → `/topics/{slug}`, and post links with `postDetailHref()` (always returns `/{slug}`) from [`src/lib/blog-post-url.ts`](./src/lib/blog-post-url.ts) — never hardcode the path. A post slug must never collide with a category slug or a reserved root segment (`all`, `rss.xml`, `sitemap.xml`, `pages-sitemap.xml`, `categories-sitemap.xml`, `authors-sitemap.xml`, `posts-sitemap`, `tags-sitemap`, `topics-sitemap`, `topics`, `robots.txt`, `llms.txt`, `api`, `search`, `tag`, `author`, `contribute`). See `packages/sanity/src/blog-reserved-slugs.ts` for the canonical list enforced in Sanity validation.

Use **Server Components** by default. Do not replace content navigation with client-side routers for SEO-critical pages.

> **Route-design conformance (required).** Two references exist:
>
> - **BA expectation (target):** [`docs/route-design-ba.png`](../../docs/route-design-ba.png) — the Business Analyst's intended route tree. Treat as the spec.
> - **Actual (current):** the Routes table above — a living reflection of what is implemented; update it whenever a route ships.
>
> On **every route task** (and whenever a new task could change the route tree), **compare the Routes table against `docs/route-design-ba.png`**. If they are inconsistent — or the proposed work would introduce a mismatch (new top-level segment, different nesting, category-as-page vs prefix, post-URL shape, a folder-based `/blog` prefix, a path colliding with a reserved segment, a BA route still missing, etc.) — **stop and notify the requester to confirm before creating files**. Do not silently reconcile the difference either way. Keep the Routes table in sync in the same change once a route is approved.

## Public URLs (PROD-1496 / PROD-1497 / PROD-1596)

- **`apps/blog`** routes are flat at the app root (`/`, `/[category]`, `/[category]/[postSlug]`, `/all`, `/rss.xml`, `/sitemap.xml`, `/pages-sitemap.xml`, `/categories-sitemap.xml`, `/authors-sitemap.xml`, `/posts-sitemap/[page]`, `/topics-sitemap/[page]`). **Do not** nest routes under an `app/blog/` folder — the `/blog` path prefix is a **config** concern (`basePath`), not a directory concern.
- **Today:** origin-root (subdomain-compatible). `basePath` is **unset** and `BLOG_BASE_PATH` is `''`.
- **Future (subpath):** blog served at `pakfactory.com/blog` via Next.js **multi-zones** (`www` at root rewrites `/blog/*` → blog zone). Flip = set `basePath: '/blog'` in `next.config.ts` **and** `NEXT_PUBLIC_BLOG_BASE_PATH=/blog`; `next/link` + every canonical/JSON-LD/RSS/sitemap then gains the prefix automatically.
- **Build absolute URLs only via [`src/lib/site.ts`](./src/lib/site.ts):** `absoluteUrl(path)` (canonicals, JSON-LD, RSS, sitemap) and `sitePath(path)` (relative metadata `url`s). **Never** concatenate `getSiteUrl()` with a raw path — `basePath` does not touch hand-built strings, so the prefix would be skipped under subpath hosting.
- **`getSiteUrl()`** / **`NEXT_PUBLIC_SITE_URL`** is the **origin only** (scheme + host, no path), e.g. `http://localhost:3003`, `https://blog.pakfactory.com`. `siteBaseUrl()` = origin + `BLOG_BASE_PATH`.
- **`getWwwUrl()`** — main marketing site for organization JSON-LD and industry links (`NEXT_PUBLIC_WWW_URL`); **not** blog-prefixed.
- **Local dev:** [http://localhost:3003](http://localhost:3003) (default `PORT=3003`). Ops, env, seed: [`memory.md`](./memory.md) § Local dev.
- Unknown routes: `[category]` (unknown/reserved single segment) and `[...segments]` call `notFound()` → [`not-found.tsx`](./src/app/not-found.tsx) (not Vercel platform 404).
- Vercel deployment checklist: [`memory.md`](./memory.md).

## Listing robots (PROD-1495)

- Use **`getBlogRobotsDirective`** / **`getListingRobotsFromSearchParams`** from [`src/lib/seo.ts`](./src/lib/seo.ts) in **`generateMetadata`** on listing routes (index today; future category/tag/author archives).
- **Post pages:** always **index, follow** (`kind: 'post'`).
- **Listings:** page **1** with no filter query params → **index, follow**; page **≥ 2** or any filter param (`tag`, `category`, `q`, `query`, `author`, `year`, `month`) → **noindex, follow**. Pagination uses **`page` only** — `page` is not a filter.

## Sanity query patterns

- Import queries from **`@pakfactory/sanity/queries`** only — do **not** inline raw GROQ strings in route files.
- All shared queries must use **`defineQuery`** in `packages/sanity`.
- Use **`getSanityClient()`** from [`src/lib/sanity/client.ts`](./src/lib/sanity/client.ts).
- Guard fetches with **`isSanityConfigured()`** from [`src/lib/sanity/env.ts`](./src/lib/sanity/env.ts) when the app must render without env (see index page pattern).
- Default caching: **`export const revalidate = 60`** unless product requires a different TTL.

## AEO / GEO — metadata and schema (targets for new/updated post pages)

Every post detail route should:

1. **`generateMetadata`**: full **title**, **description**, **Open Graph** (`og:title`, `og:description`, `og:image`, `og:type=article`), and **Twitter** card fields aligned with the content.
2. **JSON-LD**: `<script type="application/ld+json">` using **`@pakfactory/seo`** (`blogPosting`, `organization`, `person`, `breadcrumbList`, `serializeJsonLd`, etc.) — **never** hand-author schema.org objects inline in route files.
3. **GEO-friendly body structure**: answer-first lead paragraph; descriptive **H2**/**H3**; optional **FAQ** section with matching **`FAQPage`** JSON-LD when the page lists Q&A pairs (add a generator in `@pakfactory/seo` when needed).
4. **Author**: surface author name (and bio link when content model supports it) for entity clarity.

Canonical URL base: **`absoluteUrl()`** from [`src/lib/site.ts`](./src/lib/site.ts) (origin `NEXT_PUBLIC_SITE_URL` + `BLOG_BASE_PATH`) — never hardcode the `/blog` prefix. Treat this section as the **contract** for AI-generated implementations.

**Jira map:** [`docs/blog-3-jira-conventions.md`](../../docs/blog-3-jira-conventions.md).

## Blog pages (ADR-009)

**Content model:** [`blogPage`](../../apps/studio/schemas/blogPage.ts) with `pageRole`: `home` (singleton, id `blogHomePage`), `topics` (singleton, id `blogTopicsPage`), `notFound` (singleton, id `blogNotFoundPage`), `landing`, `static`. Posts stay structured articles; category archives stay taxonomy-only.

**Singleton `pageRole`:** pinned document ids imply the role; the field is hidden/read-only in Studio. New docs get role via async `initialValue` (create only). Full contract + troubleshooting: [`memory.md`](./memory.md) § blogPage singleton — pageRole contract.

**Studio:** Blog workspace → **Pages → Homepage** (`BLOG_STUDIO_LANDING_PAGES = false` in [`structure/index.ts`](../../apps/studio/structure/index.ts)). Sidebar order: Posts, Categories, Authors, Tags, Widgets, then Pages (no divider after Pages). Landing/static lists inside Pages stay hidden until design ships; backend resolver remains active when docs exist.

**i18n (dormant — English-only, 2026-07-07):** document-internationalization is parked to English-only, so Studio shows a **single Homepage / Topic page**, not one per language. All the machinery (plugin, hidden `language` field, per-type slug scoping, `-fr` ID keys) is kept in place; there is no French content or route yet. To reactivate French, see [`memory.md`](./memory.md) § i18n.

**Resolver (`/{category}`):** category → published `blogPage` → post → redirect/404. Landing URLs are **`/{slug}`** at root. `/contribute` remains a code route.

**Landing fetch:** `BLOG_PAGE_BY_SLUG_QUERY` → [`fetchBlogPageBySlug()`](./src/lib/blog-page.ts) → [`BlogLandingView`](./src/components/views/blog-landing-view.tsx) + `BlockRenderer`.

## SEO & Social field contract (studio ↔ blog wiring)

Every content document type (`post`, `blogCategory`, `blogTag`, `author`, `blogPage`) declares its SEO and Social fields through **one shared helper**, [`apps/studio/lib/seo-fields.ts`](../../apps/studio/lib/seo-fields.ts). Field **names are identical across types**, so the GROQ projection and metadata builder can treat them uniformly. The helper only declares the editor fields + defaults — **the blog side owns the fallback resolution and robots emission**. This is the contract for wiring the front-end against the schemas.

**Field set (`group: 'seo'` / `group: 'social'`):**

| Field | Type | Notes |
| --- | --- | --- |
| `metaTitle` | string | Search/tab title. ≤60 warn. |
| `metaDescription` | text | SERP snippet. ≤160 warn. |
| `canonical` | string | **Post + blogPage only** (`canonical: true`). Relative path or full URL; blank = self-canonical. |
| `allowIndex` | boolean | `true` default (`false` on `blogTag` via `indexDefault: false`). |
| `allowFollow` | boolean | `true` default. Page-level nofollow when off. |
| `noImageIndex` | boolean | `false` default. |
| `ogTitle` | string | Social share title. |
| `ogDescription` | text | Social share description. |
| `ogImage` | image (tagged) | 1200×630; `ogMediaTags(channel)`; has `alt` override. |

**Robots convention — `allowIndex` / `allowFollow` / `noImageIndex` (NOT inverted `noindex`).** The front-end derives the meta-robots directive from these three booleans:

- `allowIndex === false` → `noindex` **and** the doc is dropped from on-site Related / Featured / listings (not just from engines).
- `allowFollow === false` → `nofollow` (page-level; rare).
- `noImageIndex === true` → `noimageindex`.

**Fallback chains the GROQ/metadata layer must resolve** (blank field → correct output; resolved in the query/`generateMetadata`, never in the schema):

- `metaTitle` → `title` (post/page) / name.
- `metaDescription` → `excerpt` (post) / `description` (category/tag) .
- `ogTitle` → `metaTitle` → `title`.
- `ogDescription` → `metaDescription` → (description/excerpt).
- `ogImage` → featured/hero image → **global default** (`settings.defaultSocialImage`).
- `canonical` blank → page self-canonical via `absoluteUrl()`.

> **⚠️ `blogPage` migration (action required when wiring).** `blogPage` previously used an inverted `noindex` boolean; it now uses the shared `allowIndex`/`allowFollow`/`noImageIndex` trio. **Two consumers still read the old field and must be updated:**
>
> - [`packages/sanity/src/queries/blog.ts`](../../packages/sanity/src/queries/blog.ts) — L175 projection (`noindex,`) and L190 filter (`&& noindex != true` → `&& allowIndex != false`).
> - [`src/lib/blog-page.ts`](./src/lib/blog-page.ts) — L17 type (`noindex?: boolean`) and L56 robots (`page.noindex ? { index:false, follow:true } : undefined` → derive from `allowIndex`/`allowFollow`/`noImageIndex`).
>
> Until updated it degrades gracefully (field absent → pages stay indexed/included), so there is no crash — but an editor's noindex toggle won't take effect until this is wired.

**Status:** schemas use the shared helper today; the **GROQ projections + metadata fallback resolution are not yet wired** — see the wiring backlog in [`memory.md`](./memory.md) § "Studio ↔ blog SEO/Social wiring".

## Homepage page builder (shipped)

The blog home is a **Sanity-driven page builder**: home singleton (`blogPage`, `pageRole: home`, id `blogHomePage`), drag-reorderable **`pageBuilder`** (`pageBuilderHome` schema), each block rendered by a matching component in `components/blocks/`.

**Data flow:** Studio → `BLOG_HOME_PAGE_BUILDER_QUERY` → [`fetchBlogHomePageBuilder()`](./src/lib/blog-home.ts) → [`BlockRenderer`](./src/components/blocks/block-renderer.tsx) via [`registry.ts`](./src/components/blocks/registry.ts).

**Block types** — `components/blocks/` mirrors [`apps/studio/schemas/blocks/`](../../apps/studio/schemas/blocks/) 1:1 (Sanity content field names — `pageBuilder`, the `_type`s — are unchanged; only code/folder terminology is "block", per ADR-012):

| `_type` | File | Component | Home | Landing | Topics |
| --- | --- | --- | --- | --- | --- |
| `postFeaturedRow` | `post-featured-row` | `PostFeaturedRow` | yes | no | yes |
| `postCategoryRow` | `post-category-row` | `PostCategoryRow` | yes | no | yes |
| `postPopularRow` | `post-popular-row` | `PostPopularRow` | yes | no | yes |
| `postSpotlightRow` | `post-spotlight-row` | `PostSpotlightRow` | yes | no | yes |
| `tagStrip` | `tag-strip` | `TagStrip` | yes | yes | yes |
| `ctaNewsletter` | `cta-newsletter` | `CtaNewsletter` | yes | yes | yes |
| `ctaRfq` | `cta-rfq` | `CtaRfq` | yes | yes | yes |
| `ctaPillars` | `cta-pillars` | `CtaPillars` | yes | yes | yes |
| `richTextBand` | `rich-text-band` | `RichTextBand` | no | yes | no |

**Add a block (4 places):** Studio schema + [`schemas/blocks/index.ts`](../../apps/studio/schemas/blocks/index.ts) → component → `registry.ts` → GROQ branch in `PAGE_BUILDER_BLOCKS_PROJECTION` ([`packages/sanity/src/queries/blog.ts`](../../packages/sanity/src/queries/blog.ts)). Register new blocks in `insertMenu.groups` (home vs landing) in [`schemas/blocks/index.ts`](../../apps/studio/schemas/blocks/index.ts).

**Insert menu (Studio):** **+ Add item** uses tabs **All** (always) + **Post** / **Tag** / **CTA** on the homepage (`pageBuilderLanding` adds **Content**). Each block also carries a colour-coded "kind" badge in the array list via [`BlockItemPreview`](../../apps/studio/components/BlockItemPreview.tsx). Grid view supports optional preview thumbnails: drop `{_type}.webp` in [`apps/studio/static/page-builder-thumbnails/`](../../apps/studio/static/page-builder-thumbnails/) and register the `_type` in [`page-builder-preview.ts`](../../apps/studio/schemas/blocks/page-builder-preview.ts) (currently empty → each block's default schema icon is shown).

**Local ops:** Studio → **Pages → Homepage**. **Humans:** bootstrap with seed commands in [`memory.md`](./memory.md) when the page builder is empty. **Agents:** do not run seeds or mutate Sanity documents ([`AGENTS.md`](../../AGENTS.md) § Sanity content — agent guardrails).

## Topics page builder (shipped)

The `/topics` index uses a **hybrid layout**: the taxonomy grid renders **only** groups listed on the Topic page Overview **`topics`** reference array (drag order; headings show even when a group has no published topic links yet). Publishing a new `blogTopicGroup` **prepends** it to that array via [`publishTopicGroupToTopicsPage`](../../apps/studio/actions/publishTopicGroupToTopicsPage.ts). Header (title + description) and sections **below** the grid are CMS-managed on the topics singleton (`blogPage`, `pageRole: topics`, id `blogTopicsPage`) via **`pageBuilder`** / **`pageBuilderHome`**.

**Data flow:** `BLOG_TOPICS_PAGE_BUILDER_QUERY` → [`fetchBlogTopicsPage()`](./src/lib/blog-topics-page.ts) → [`fetchTopicsIndex(page.topics)`](./src/lib/blog-topics-index.ts) for the grid; `pageBuilder` → [`BlockRenderer`](./src/components/blocks/block-renderer.tsx).

**Editor tabs:** Overview (title, description, **Topics** grid curator), SEO, Social, Page blocks — same shape as Homepage; `pageRole` is hidden on the pinned singleton.

**Local ops:** Studio → **Pages → Topic page**. **Humans:** see [`memory.md`](./memory.md) for seed commands when bootstrapping. **Agents:** do not run seeds or mutate Sanity documents.

**Presentation:** Blog workspace → **Presentation** → `/topics`. Location resolver maps singleton id `blogTopicsPage` → `/topics` (see [`presentation/locations.ts`](../../apps/studio/presentation/locations.ts) + [`blog-page-singletons.ts`](../../apps/studio/lib/blog-page-singletons.ts)). Page fetches use `getPreviewableSanityClient()` for draft overlays on title, description, and page sections.

## Components and files

- **File naming:** kebab-case, **file name === exported component** (ADR-005 D5, still in force). Use a **prefix-first stem** (`post-featured-row`, `filter-active`, `site-nav`) so alphabetical sort clusters related files; see ADR-008 for recognized prefixes. Never a registry/positional ID (`hero-section-32`).
- **Location (ADR-008 + ADR-011 hybrid; ADR-007 still in force):** canonical in **[ADR-008](../../docs/adr/0008-component-archetype-grouping.md)** (layer axis) amended by **[ADR-011](../../docs/adr/0011-component-feature-layer-hybrid.md)** (feature clustering). Retains **[ADR-005](../../docs/adr/0005-component-organization.md)** routing-only `app/` + naming, and **[ADR-007](../../docs/adr/0007-inline-single-route-page-views.md)** inline-single-route views. **`app/` holds routing files** (`page.tsx` / `route.ts` / `layout.tsx` / `sitemap.ts` …) and may inline a whole-page view's JSX directly in its `page.tsx` (ADR-007). **Every importable/shared component lives under `src/components/`**; no components are imported from `app/`. `src/` stays **`app/ components/ lib/`** only.
    - **`src/components/` = all application UI**, **grouped primarily by archetype/layer** (ADR-008), with **optional feature clustering** (ADR-011): top-level feature folders for multi-layer single-page surfaces (`post/`), feature subfolders inside a layer at 3+ same-layer files (`modules/widget/`). Imported via **`@/components/{archetype}/{file}`** or **`@/components/{archetype}/{feature}/{file}`**. Use the **ordered decision rule** in ADR-011 to pick a folder:
        1. Sanity page-builder block → **`blocks/`**
        2. Site chrome → **`layout/`**
        3. Multi-route whole-page template → **`views/`** (single-route stays inline in `page.tsx`)
        4. Sanity-data-driven building block → **`modules/`**
        5. Presentational app-local primitive → **`ui/`** (cross-app → `@pakfactory/ui`)
    - **Folder contents:**
        - **`blocks/` — page-builder blocks**, one per Studio [`schemas/blocks/`](../../apps/studio/schemas/blocks/) type; targets of the `_type → component` resolver in [`registry.ts`](./src/components/blocks/registry.ts). Current blocks: `post-featured-row`, `post-category-row`, `post-popular-row`, `post-spotlight-row`, `tag-strip`, `cta-newsletter`, `cta-rfq`, `cta-pillars`, `rich-text-band`. **Adding a block** — see [Homepage page builder (shipped)](#homepage-page-builder-shipped) above.
        - **`layout/` — site chrome / page frame.** `site-nav`, `site-nav-categories`, `site-footer`, `footer-wordmark`, `breadcrumb`, `page-dieline-section`.
        - **`views/` — multi-route route-level templates** (single-route views are inlined per ADR-007). `category-archive-view`, `all-archive-view`, `topic-archive-view`, `author-archive-view`, `author-header`, `archive-layout`, `blog-landing-view`.
        - **`modules/` — Sanity-data-driven reusable building blocks.** `post-card`, `post-list`, `pagination`, `search-form`, `contribute-form`, `category-filter-bar`. **Feature subfolders:** `modules/widget/` (`widget-renderer`, `widget-cta`, `widget-product-card`) — portable-text reference widgets (CTA, product card); `modules/filter/` (`filter-sidebar`, `filter-active`, `filter-archive-sidebar`) — faceted archive filters and `/all` browse nav; `modules/inline/` (`body-callout`, ...) — inline post-body blocks authored in place (like `bodyImage`), mirroring Studio [`schemas/inline/`](../../apps/studio/schemas/inline/). Add an inline block: `schemas/inline/<body-x>.ts` + barrel `schemas/inline/index.ts` (auto-registers in `post.body`; appears as a native PT toolbar insert button) → renderer `modules/inline/<body-x>.tsx` → `bodyX` entry in [`post-portable-text`](./src/components/post/post-portable-text.tsx) `types`.
        - **`post/` — top-level feature folder (ADR-011).** Post-detail page surface components spanning multiple layers: `post-detail-layout`, `post-portable-text`, `post-faq-section`, etc.
        - **`ui/` — app-local presentational primitives** (distinct from the cross-app **`@pakfactory/ui`** package; import `@/components/ui/*` vs `@pakfactory/ui/components/*`). `portable-text`, `category-chips`.
        - Route-agnostic via callbacks: `pagination` (`hrefForPage(page)`), `filter-active` (`hrefFor(page, filters)`), `filter-sidebar` (`facetHref` + form actions) — all in `modules/filter/`. `filter-sidebar` is the faceted "Filter results" sidebar; `filter-archive-sidebar` is the `/all` "Browse" category-**nav** (distinct). `post-list` is the reusable grid/list of `post-card` items; `post-category-row` is one homepage category row (heading + "View all" + `post-list`). `tag-strip` renders any tag group's pills. `breadcrumb` composes the `@pakfactory/ui` breadcrumb primitive.
    - **Single-route → inline; multi-route → component (ADR-007).** A **whole-page view rendered by exactly one route** is written **inline in that route's `page.tsx`** (private sub-components/helpers in the same file) — e.g. search in `search/page.tsx`. The ADR-009 resolver lives in `[category]/page.tsx` via `resolveBlogSegment()`. A view **shared by 2+ routes** stays a component in **`components/views/`**: `category-archive-view`, `tag-archive-view`, and `all-archive-view` are each used by a page-1 route **and** its `/page/[n]` route. `app/` never holds an importable component or a `_components/` folder; if an inlined view later needs a second route, extract it to `src/components/views/` then.
    - **Don't duplicate:** when a second feature needs a component, generalize its props and move it to the correct archetype folder (`modules/` for data-driven, `ui/` for presentational); share cross-app primitives via **`@pakfactory/ui`**.
- **Styling:** use tokens from **`@pakfactory/ui/globals.css`**; do not extend `globals.css` with new tokens or `@theme` blocks for features.
- **UI primitives (`@pakfactory/ui`):** Prefer existing shadcn-style components for interactive and marketing surfaces — e.g. **`Card`** (+ `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`) for bands and pillar layouts, **`Button`** for CTAs, **`Badge`** for chips/pills, **`Input`** for forms. Avoid raw bordered `div`s when a matching primitive exists; keep one-off layout in `src/components/<archetype>/` with `className` only.

## Active skills (Claude Code)

For blog writing and SEO tasks, prefer the in-repo skills registered in root [`CLAUDE.md`](../../CLAUDE.md): **seo-content-writer**, **on-page-seo-auditor**, **geo-content-optimizer**.
