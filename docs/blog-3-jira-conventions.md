# Blog 3.0 — Jira → repo conventions (for humans and AI)

This document maps **done** Blog 3.0 dev tickets to **binding** patterns in the monorepo. AI tools should treat it as an extension of [`AGENTS.md`](../AGENTS.md).

| Jira | Summary | Status | Where enforced |
|------|---------|--------|----------------|
| [PROD-1480](https://dotdirect.atlassian.net/browse/PROD-1480) | Epic — Tech Prerequisites | Done | This doc + `AGENTS.md` |
| [PROD-1486](https://dotdirect.atlassian.net/browse/PROD-1486) | T0.1 — pnpm migration (ADR-002) | Done | Root `package.json`, `pnpm-workspace.yaml`, `AGENTS.md` |
| [PROD-1487](https://dotdirect.atlassian.net/browse/PROD-1487) | T0.2 — `@pakfactory/seo` | Done | [`packages/seo`](../packages/seo/), [`packages/seo/CLAUDE.md`](../packages/seo/CLAUDE.md) |
| [PROD-1516](https://dotdirect.atlassian.net/browse/PROD-1516) | Standardize AI IDE config | Done | [`AGENTS.md`](../AGENTS.md), [`CLAUDE.md`](../CLAUDE.md), [`.cursor/rules/`](../.cursor/rules/), [`.claude/skills/`](../.claude/skills/) |
| [PROD-1495](https://dotdirect.atlassian.net/browse/PROD-1495) | T5.2 — Listing `noindex` rules | Done | [`apps/blog/src/lib/seo.ts`](../apps/blog/src/lib/seo.ts), [`apps/blog/CLAUDE.md`](../apps/blog/CLAUDE.md) |
| [PROD-1496](https://dotdirect.atlassian.net/browse/PROD-1496) | T5.3 — Vercel blog deployment (root URLs) | Done | [`apps/blog/next.config.ts`](../apps/blog/next.config.ts), [`apps/blog/memory.md`](../apps/blog/memory.md) |
| [PROD-1506](https://dotdirect.atlassian.net/browse/PROD-1506) | S2.10 — Blog 404 + recovery rail | Done | [`apps/blog/src/app/not-found.tsx`](../apps/blog/src/app/not-found.tsx), [`apps/blog/src/app/_components/`](../apps/blog/src/app/_components/) |
| [PROD-1497](https://dotdirect.atlassian.net/browse/PROD-1497) | S2.1 — Blog home page | Done | [`apps/blog/src/app/page.tsx`](../apps/blog/src/app/page.tsx), [`apps/blog/src/lib/blog-home.ts`](../apps/blog/src/lib/blog-home.ts) |
| [PROD-1505](https://dotdirect.atlassian.net/browse/PROD-1505) | S2.9 — RSS feed | Done | [`apps/blog/src/app/rss.xml/route.ts`](../apps/blog/src/app/rss.xml/route.ts), [`apps/blog/src/lib/rss.ts`](../apps/blog/src/lib/rss.ts) |
| [PROD-1498](https://dotdirect.atlassian.net/browse/PROD-1498) | S2.2 — All posts archive | Request For Approval | [`apps/blog/src/app/all/`](../apps/blog/src/app/all/), [`apps/blog/src/lib/blog-archive.ts`](../apps/blog/src/lib/blog-archive.ts) |
| [PROD-1499](https://dotdirect.atlassian.net/browse/PROD-1499) | S2.3 — Category archives | Request For Approval | [`apps/blog/src/app/category/`](../apps/blog/src/app/category/), [`apps/blog/src/lib/blog-category-archive.ts`](../apps/blog/src/lib/blog-category-archive.ts) |
| [PROD-1596](https://dotdirect.atlassian.net/browse/PROD-1596) | Centralize blog URL base (subpath readiness) | Request For Approval | [`apps/blog/src/lib/site.ts`](../apps/blog/src/lib/site.ts), [`apps/blog/src/app/sitemap.ts`](../apps/blog/src/app/sitemap.ts) |
| [PROD-1500](https://dotdirect.atlassian.net/browse/PROD-1500) | S2.4 — Tag archives `/tag/[slug]` | Request For Approval | [`apps/blog/src/app/tag/`](../apps/blog/src/app/tag/), [`apps/blog/src/lib/blog-tag-archive.ts`](../apps/blog/src/lib/blog-tag-archive.ts) |

## PROD-1486 — pnpm only

- Install and scripts at repo root: **`pnpm`** only (never `npm install` / `yarn`).
- Internal workspace deps: **`workspace:*`** protocol.
- ADR-002: package manager is **pnpm workspaces**.

## PROD-1487 — `@pakfactory/seo`

- All JSON-LD for blog (and future `apps/www` schema) must use generators from **`@pakfactory/seo`**.
- Export surface: `blogPosting`, `newsArticle`, `organization`, `person`, `breadcrumbList`, `collectionPage`, `jsonLdGraph`, `serializeJsonLd`.
- Do **not** hand-build schema.org objects in route files.

## PROD-1516 — AI IDE config

- **Canonical:** [`AGENTS.md`](../AGENTS.md).
- **Claude Code:** [`CLAUDE.md`](../CLAUDE.md) + [`.claude/skills/`](../.claude/skills/).
- **Cursor:** [`.cursor/rules/pakfactory-stack.mdc`](../.cursor/rules/pakfactory-stack.mdc) + [`apps/blog/.cursor/rules/blog.mdc`](../apps/blog/.cursor/rules/blog.mdc).
- **Blog overrides:** [`apps/blog/CLAUDE.md`](../apps/blog/CLAUDE.md).
- Onboarding: [`README.md`](../README.md) → **AI IDE setup** + verification prompts.

## PROD-1495 — Listing robots

- Utility: **`getBlogRobotsDirective`** / **`getListingRobotsFromSearchParams`** in `apps/blog/src/lib/seo.ts`.
- **Post detail:** always `index, follow`.
- **Listing** (`blog_index`, future `category` / `tag` / `author`):
  - Page **1**, no filter query params → `index, follow`.
  - Page **≥ 2** or **any filter** (`tag`, `category`, `q`, `query`, `author`, `year`, `month`) → **`noindex, follow`**.
- Pagination uses `page` only — **`page` is not a filter**.

## PROD-1496 — URLs and deployment

- **No `basePath`:** `apps/blog` serves at the deployment root (`/`, `/[slug]`, `/rss.xml`). Jira “/blog” refers to the monorepo app path, not a URL prefix.
- **`NEXT_PUBLIC_SITE_URL`:** blog origin only (e.g. `https://blog.pakfactory.com`, `http://localhost:3003`) for canonicals and JSON-LD.
- **`NEXT_PUBLIC_WWW_URL`:** main marketing site for organization JSON-LD and outbound industry links.
- **Vercel:** separate project, root `apps/blog`, install/build in [`apps/blog/vercel.json`](../apps/blog/vercel.json). Ops checklist: [`apps/blog/memory.md`](../apps/blog/memory.md).
- **404:** unknown routes use [`not-found.tsx`](../apps/blog/src/app/not-found.tsx) via `notFound()` — not Vercel platform 404.
- **Local URLs:** `http://localhost:3003`, `http://localhost:3003/<slug>` (default `PORT=3003`).

## PROD-1497 — Blog home

- **Route:** `apps/blog/src/app/page.tsx` (public `/` on the blog host).
- **Title:** `PakFactory Blog — Packaging Insights, Trends & Industry News`.
- **Hero:** `post.featuredOnHome` (studio) + 4 latest; fallback featured = newest published.
- **Categories (row order):** packaging-news → trends → business-strategy → sustainability → design-inspiration; 3 posts each; “View All →” → `/category/[slug]` (archive in PROD-1499).
- **Industries:** up to 10 from `industry` docs + static fallback; links to `{NEXT_PUBLIC_WWW_URL}/industries/{slug}`.
- **JSON-LD:** `blog()` + `organization()` from `@pakfactory/seo`.
- **Reuse:** `NewsletterCtaBand`, `GlobalRfqCta` from 404 work; marketing bands use `@pakfactory/ui` `Card` / `Button` / `Badge`.
- **Local CMS:** dataset **`development`**; seed with `pnpm --filter @pakfactory/studio run seed` + `pnpm seed:blog-dev`. Blog env: root `.env.local` + [`apps/blog/.env.local`](../apps/blog/.env.local) — details in [`apps/blog/memory.md`](../apps/blog/memory.md) § Local dev.

## PROD-1506 — 404 and recovery rail

- **404 route:** App Router `not-found.tsx`; unknown post slugs already call `notFound()` from `[slug]/page.tsx`.
- **Robots:** `getBlogRobotsDirective({ kind: 'error' })` → **`noindex, follow`**.
- **GROQ:** [`packages/sanity/src/queries/blog.ts`](../packages/sanity/src/queries/blog.ts) — field names match **`apps/studio`** schemas (`blogCategory`, `post.publishedAt`, `author.photo`).
- **Reuse:** `_components/blog-search-form`, `category-chips`, `popular-posts-rail` for search zero-results (PROD-1503).
- **Popular rail:** current UTC month by `publishedAt`, then latest published (no `viewCount` until studio adds it).
- **Newsletter:** `POST /api/newsletter` when `NEWSLETTER_WEBHOOK_URL` is set.

## PROD-1499 — Category archives

- **Routes:** `/[category]` (page 1), `/[category]/page/[n]` (page 2+); filters in query (`tag`, `author`, `year`, `month`, `sort`). *(URL scheme updated by PROD-1597 — see below; the `/category/` prefix shown originally is gone.)*
- **Post detail:** canonical post URL is **`/{slug}`** (root), not category-scoped — see PROD-1597 below. `postDetailHref()` in [`apps/blog/src/lib/blog-post-url.ts`](../apps/blog/src/lib/blog-post-url.ts) returns `/{slug}`.
- **CMS:** `blogCategory.description` via `pt::text`; 5 allowed slugs match studio validation.
- **Layout:** sidebar filters + 3-column grid (12/page); **Packaging News** uses `PostCard` `headline` variant.
- **Robots:** `getCategoryListingRobots` — page 1 unfiltered **index**; page 2+ or any filter param **noindex, follow**.
- **JSON-LD:** `collectionPage` + `itemList` + `breadcrumbList`; item URLs are root post paths (`/{slug}`, PROD-1597).
- **Unknown slug:** `notFound()`.
- **`sanity-image.ts`:** `import "server-only"` — prevents `require is not defined` if image URL builder leaks to client.

## PROD-1498 — All posts archive

- **Routes:** `/all` (page 1), `/all/page/[n]` (page 2+); `/all/page/1` redirects to `/all`.
- **Pagination:** 12 posts per page, newest first; out-of-range → `notFound()`.
- **Robots:** `getAllArchiveRobots(page)` — page 1 **index**, page 2+ **noindex, follow** (`all_archive` kind in `seo.ts`).
- **Sidebar:** `ArchiveFilterSidebar` — categories link to `/category/[slug]` (PROD-1499); no filter query logic on this route.
- **JSON-LD:** `collectionPage` + `itemList` + `breadcrumbList` via `@pakfactory/seo` (`itemList` generator added in package).
- **GROQ:** `BLOG_ALL_POSTS_COUNT_QUERY`, `BLOG_ALL_POSTS_PAGE_QUERY` in [`packages/sanity/src/queries/blog.ts`](../packages/sanity/src/queries/blog.ts).

## PROD-1505 — RSS feed

- **Route:** `apps/blog/src/app/rss.xml/route.ts` → public **`/rss.xml`**.
- **Format:** RSS 2.0, `Content-Type: application/xml; charset=utf-8`.
- **Items:** latest **20** published posts — title, link, excerpt (CDATA), `pubDate`, `category`, `dc:creator` (author).
- **GROQ:** `BLOG_RSS_POSTS_QUERY` in [`packages/sanity/src/queries/blog.ts`](../packages/sanity/src/queries/blog.ts).
- **Autodiscovery:** `metadata.alternates.types['application/rss+xml']` in [`apps/blog/src/app/layout.tsx`](../apps/blog/src/app/layout.tsx) (`url: '/rss.xml'`).
- **Revalidation:** `BLOG_REVALIDATE_SECONDS` (60) in [`apps/blog/src/lib/blog-cache.ts`](../apps/blog/src/lib/blog-cache.ts); tag `blog-posts` reserved for Sanity webhooks.

## PROD-1596 — Blog URL base (subpath readiness)

- **Origin only:** `NEXT_PUBLIC_SITE_URL` is scheme + host, **no path**. The blog path prefix lives in `BLOG_BASE_PATH` (`NEXT_PUBLIC_BLOG_BASE_PATH`), `''` today.
- **Build absolute URLs via [`apps/blog/src/lib/site.ts`](../apps/blog/src/lib/site.ts) only:** `absoluteUrl(path)` (canonical, JSON-LD, RSS, sitemap), `siteBaseUrl()` (blog root / entity ids), `sitePath(path)` (relative metadata `url`s). **Never** concatenate `getSiteUrl()` with a raw path — `basePath` does not prefix hand-built strings.
- **Routes stay flat** at the app root; the `/blog` prefix is `basePath` config, never an `app/blog/` folder (Next.js **multi-zones**).
- **Sitemap:** [`apps/blog/src/app/sitemap.ts`](../apps/blog/src/app/sitemap.ts) (served at `/sitemap.xml` today, `/blog/sitemap.xml` under subpath) lists home + `/all` + categories + posts; paginated/filtered (`noindex`) listings excluded. GROQ `BLOG_SITEMAP_POSTS_QUERY`.
- **Subpath flip (out of scope here, needs www zone + DNS):** set `basePath: '/blog'` in `next.config.ts` **and** `NEXT_PUBLIC_BLOG_BASE_PATH=/blog`; `apps/www` rewrites `/blog/*` → blog zone.
- Supersedes the old "`NEXT_PUBLIC_SITE_URL` must include `/blog`" note in `apps/blog/CLAUDE.md`.

## PROD-1500 — Tag archives

- **Routes:** `/tag/[slug]` (page 1), `/tag/[slug]/page/[n]` (page 2+; `/page/1` → `/tag/[slug]`). `tag` is a reserved root segment (PROD-1597) — physical route beats `[category]`.
- **Tags are flat** (`blogTag`); axis = `tagGroup` (`material`, `packaging-type`, `finish`, `industry`; `ungrouped` sentinel). Front-end label map mirrors studio in [`apps/blog/src/lib/tag-groups.ts`](../apps/blog/src/lib/tag-groups.ts) — keep in sync with `TAG_GROUPS` in `apps/studio/schemas/blogTag.ts`.
- **Kicker:** axis title from `tagGroup` (omit when ungrouped). **Sidebar:** co-occurring tags grouped by axis, **own-axis row hidden**; author/date/sort. `tag` is the page, **not** a filter param (filters: `author`, `year`, `month`, `sort`).
- **Robots:** `getTagListingRobots(page, sp, hasPosts)` — page 1 unfiltered + ≥1 post **index**; **empty tag**, page ≥2, or any filter **noindex, follow** (empty→noindex is tag-specific).
- **JSON-LD:** `collectionPage` + `itemList` + `breadcrumbList`; post item URLs via `absoluteUrl(postDetailHref(slug, categorySlug))` (posts span categories).
- **Unknown slug / out-of-range page → `notFound()`.**

## PROD-1597 — Blog URL scheme (current source of truth)

- **No `/category/` prefix.** Category archives at `/{category}`; category pagination `/{category}/page/{n}`.
- **A post's only URL is `/{slug}`** (root). Category, tag, search, and home are **discovery paths only** — they never scope the post URL. (Updated 2026-05-27; reverts the earlier category-scoped `/{category}/{post}` post URL.)
- **Single root segment `/[category]` is a resolver:** known category slug → archive; otherwise → post by slug; otherwise `notFound()`. Reserved/physical routes (`/all`, `/tag`, `/rss.xml`, `/sitemap.xml`, `/api`, future `/search`, `/author`, `/contribute`) win over the dynamic segment.
- **Permanent redirects:** legacy `/{category}/{postSlug}` → `/{postSlug}` (route-level `permanentRedirect`, 308); `/category/:cat`, `/category/:cat/page/:n`, `/category/:cat/:postSlug` → de-prefixed / root post (`next.config.ts`).
- **Links:** `categoryHref()` → `/{category}`, `tagHref()` → `/tag/{slug}`, `postDetailHref()` → `/{slug}` (in `apps/blog/src/lib/blog-post-url.ts`). Never hardcode paths. Canonical/JSON-LD/RSS/sitemap derive from `postDetailHref` + `absoluteUrl()`, so they emit `/{slug}` automatically.
- **Breadcrumb** still shows category context: Blog → Category (`/{category}`) → Post (`/{slug}`).
- **Collision rule:** a post slug must never equal a category slug or a reserved root segment.

## JIRA workflow (Product project)

| Item | Convention |
|------|------------|
| **Project key** | `PROD` |
| **Issue prefix** | `PROD-123` |
| **Branches** | `feat/PROD-123-short-slug`, `fix/PROD-123-short-slug` |
| **Commits** | `PROD-123: summary` or trailer `Refs: PROD-123` |
| **PR titles** | `[PROD-123] Short description` |
