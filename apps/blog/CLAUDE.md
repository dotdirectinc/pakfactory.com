# CLAUDE.md — `@pakfactory/blog`

Inherits root [`CLAUDE.md`](../../CLAUDE.md) and [`AGENTS.md`](../../AGENTS.md). This file adds **blog-app** conventions only.

## Routes (Next.js App Router)

| Route | File | Notes |
|-------|------|--------|
| `/` | [`src/app/page.tsx`](./src/app/page.tsx) | Blog home; `revalidate = 60` |
| `/all` | [`src/app/all/page.tsx`](./src/app/all/page.tsx) | All posts archive page 1 (PROD-1498) |
| `/all/page/[n]` | [`src/app/all/page/[n]/page.tsx`](./src/app/all/page/[n]/page.tsx) | Archive pagination; page 1 → `/all` |
| `/rss.xml` | [`src/app/rss.xml/route.ts`](./src/app/rss.xml/route.ts) | RSS 2.0 |
| `/sitemap.xml` | [`src/app/sitemap.ts`](./src/app/sitemap.ts) | XML sitemap (PROD-1596) |
| `/[category]` | [`src/app/[category]/page.tsx`](./src/app/%5Bcategory%5D/page.tsx) | **Resolver:** known category slug → archive; else → **single post** `/{slug}` (PROD-1597) |
| `/[category]/page/[n]` | [`src/app/[category]/page/[n]/page.tsx`](./src/app/%5Bcategory%5D/page/%5Bn%5D/page.tsx) | Category pagination + query filters |
| `/[category]/[postSlug]` | [`src/app/[category]/[postSlug]/page.tsx`](./src/app/%5Bcategory%5D/%5BpostSlug%5D/page.tsx) | **Legacy scoped post** → permanent redirect to `/{postSlug}` (PROD-1597) |
| `/tag/[slug]` | [`src/app/tag/[slug]/page.tsx`](./src/app/tag/%5Bslug%5D/page.tsx) | Tag archive page 1 (PROD-1500); axis-aware kicker + sidebar |
| `/tag/[slug]/page/[n]` | [`src/app/tag/[slug]/page/[n]/page.tsx`](./src/app/tag/%5Bslug%5D/page/%5Bn%5D/page.tsx) | Tag pagination + filters; page 1 → `/tag/[slug]` |
| `/author/[slug]` | [`src/app/author/[slug]/page.tsx`](./src/app/author/%5Bslug%5D/page.tsx) | Author profile (PROD-1501); SSR 12 + client "Load More", Person JSON-LD |
| `/api/author/[slug]/posts` | [`src/app/api/author/[slug]/posts/route.ts`](./src/app/api/author/%5Bslug%5D/posts/route.ts) | Load-More feed (JSON, 12/page, `?offset=`) |

**URL scheme (PROD-1597, updated 2026-05-27):** no `/category/` prefix. A **post's only URL is `/{slug}`** (root) — category/tag/search/home are *discovery paths*, never URL scoping. The single root segment `/[category]` resolves to a category archive (known slug) or otherwise a post. Legacy `/{category}/{post-slug}` and `/category/...` URLs **permanently redirect** (route-level `permanentRedirect` + `next.config.ts`). Build category links with `categoryHref()`, tag links with `tagHref()`, and post links with `postDetailHref()` (always returns `/{slug}`) from [`src/lib/blog-post-url.ts`](./src/lib/blog-post-url.ts) — never hardcode the path. A post slug must never collide with a category slug or a reserved root segment (`all`, `rss.xml`, `sitemap.xml`, `api`, `search`, `tag`, `author`, `contribute`).

Use **Server Components** by default. Do not replace content navigation with client-side routers for SEO-critical pages.

> **Route-design conformance (required).** Two references exist:
> - **BA expectation (target):** [`docs/route-design-ba.png`](../../docs/route-design-ba.png) — the Business Analyst's intended route tree. Treat as the spec.
> - **Actual (current):** the Routes table above — a living reflection of what is implemented; update it whenever a route ships.
>
> On **every route task** (and whenever a new task could change the route tree), **compare the Routes table against `docs/route-design-ba.png`**. If they are inconsistent — or the proposed work would introduce a mismatch (new top-level segment, different nesting, category-as-page vs prefix, post-URL shape, a folder-based `/blog` prefix, a path colliding with a reserved segment, a BA route still missing, etc.) — **stop and notify the requester to confirm before creating files**. Do not silently reconcile the difference either way. Keep the Routes table in sync in the same change once a route is approved.

## Public URLs (PROD-1496 / PROD-1497 / PROD-1596)

- **`apps/blog`** routes are flat at the app root (`/`, `/[category]`, `/[category]/[postSlug]`, `/all`, `/rss.xml`, `/sitemap.xml`). **Do not** nest routes under an `app/blog/` folder — the `/blog` path prefix is a **config** concern (`basePath`), not a directory concern.
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

## Components and files

- **File naming:** kebab-case, **page-agnostic** — name a component for what it *does*, never which page renders it (`post-card.tsx`, `pagination.tsx`, `filter-sidebar.tsx`, `rfq-cta.tsx`; **not** `home-hero.tsx`, `category-archive-pagination.tsx`).
- **Location & layout (organize by reusability, not by page — supersedes PROD-1609):** governed by the management-root rules [`components-by-reusability`](../../.claude/rules/components-by-reusability.md) and [`clean-src-structure`](../../.claude/rules/clean-src-structure.md). `src/` stays to **`app/ components/ lib/`** only.
  - **`src/components/` = cross-page shared only**, flat and role-named, imported via **`@/components/{file}`**. A component used by **2+ routes** lives here. Current set: `post-card`, `portable-text`, `pagination`, `active-filters`, `category-chips`, `popular-posts-rail`, `search-form`, `rfq-cta`, `newsletter-cta-band`.
    - `pagination` is route-agnostic — callers pass `hrefForPage(page)`. `active-filters` is shared by category + tag — callers pass `hrefFor(page, filters)`; tag archives omit `tags` so no tag chip renders.
  - **Page-specific (single-route) components colocate** under **`app/<route>/_components/`** (the `_` keeps the folder out of routing), imported via **`@/app/<route>/_components/{file}`**. Current colocations:
    - `app/_components/` (home) — `hero`, `category-row`, `conversion-pillars`, `industry-strip`
    - `app/all/_components/` — `all-posts-archive`, `filter-sidebar`
    - `app/[category]/_components/` — `archive-view`, `filter-sidebar`, `blog-post-article`
    - `app/author/[slug]/_components/` — `author-header`, `posts-loader`
    - `app/tag/[slug]/_components/` — `archive-view`, `filter-sidebar`
  - **Promote, don't duplicate:** when a second route needs a colocated component, lift it into `src/components/` with a clear name and generalize its props. Share generic primitives via **`@pakfactory/ui`**. (The three `filter-sidebar`s have diverged and stay colocated for now — unify when they converge.)
- **Styling:** use tokens from **`@pakfactory/ui/globals.css`**; do not extend `globals.css` with new tokens or `@theme` blocks for features.
- **UI primitives (`@pakfactory/ui`):** Prefer existing shadcn-style components for interactive and marketing surfaces — e.g. **`Card`** (+ `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`) for bands and pillar layouts, **`Button`** for CTAs, **`Badge`** for chips/pills, **`Input`** for forms. Avoid raw bordered `div`s when a matching primitive exists; keep one-off layout in `src/components/` (shared) or `app/<route>/_components/` (page-specific) with `className` only.

## Active skills (Claude Code)

For blog writing and SEO tasks, prefer the in-repo skills registered in root [`CLAUDE.md`](../../CLAUDE.md): **seo-content-writer**, **on-page-seo-auditor**, **geo-content-optimizer**.
