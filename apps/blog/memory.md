# Blog app — working memory

Last updated: 2026-05-25.

**AI / Jira binding rules:** [`docs/blog-3-jira-conventions.md`](../../docs/blog-3-jira-conventions.md) · [`CLAUDE.md`](./CLAUDE.md) · [`AGENTS.md`](../../AGENTS.md).

## PROD-1496 — Vercel deployment (approach A, implemented in repo)

**Jira:** [PROD-1496](https://dotdirect.atlassian.net/browse/PROD-1496) — T5.3 Configure Vercel deployment for `apps/blog`  
**Routing:** Blog app serves at **deployment root** (`/`, `/[slug]`, `/rss.xml`). No Next.js `basePath`. Jira “/blog home” = `apps/blog/`, not a URL prefix.

### What was shipped (code)

| Deliverable | Location |
|-------------|----------|
| Root routes (no `basePath`) | `next.config.ts` — home at `/` |
| Unknown paths → app 404 | `not-found.tsx`, `[slug]` + `[...segments]` → `notFound()` |
| Turbo: blog build after workspace typechecks | `turbo.json` → `@pakfactory/blog#build` |
| `NEXT_PUBLIC_SITE_URL` in Turbo build/dev env | `turbo.json` |
| Local default origin (no path prefix) | `src/lib/site.ts` |
| Env example | root `.env.example` |

### Vercel project (dashboard + `vercel.json`)

| Setting | Value |
|---------|--------|
| Root Directory | `apps/blog` |
| Include files outside root | **On** |
| Install | `pnpm install --frozen-lockfile` (`vercel.json`) |
| Build | `pnpm turbo run build --filter=@pakfactory/blog` (`vercel.json`) |
| Ignore unchanged | `npx turbo-ignore @pakfactory/blog` (`vercel.json`) |
| Framework | Next.js — deployment is managed; no `start` on Vercel |
| Production `NEXT_PUBLIC_SITE_URL` | Blog origin, e.g. `https://blog.pakfactory.com` |

Preview deployments: enable on PRs; set preview Sanity vars as needed.

### Local URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3003` | Home (default dev port; override with `PORT`) |
| `http://localhost:3003/<slug>` | Post |
| `http://localhost:3003/rss.xml` | RSS 2.0 feed (PROD-1505) |

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

| Deliverable | Location |
|-------------|----------|
| Robots utility | `src/lib/seo.ts` |
| Index listing metadata | `src/app/page.tsx` — `generateMetadata` + `searchParams` |
| Post metadata (indexable + OG/Twitter) | `src/app/[slug]/page.tsx` — `generateMetadata` |
| Excerpt for post descriptions | `packages/sanity/src/queries.ts` — `POST_BY_SLUG_QUERY` includes `excerpt` |

### `getBlogRobotsDirective()` rules

| Input | `index` | `follow` |
|-------|---------|----------|
| `kind: 'post'` | `true` | `true` |
| Listing, page 1, no filters | `true` | `true` |
| Listing, page ≥ 2 | `false` | `true` |
| Listing, any active filter query param | `false` | `true` |

**Listing kinds:** `blog_index`, `category`, `tag`, `author` (latter three ready for future archive routes).

**Filter query keys** (non-empty value → filtered): `tag`, `category`, `q`, `query`, `author`, `year`, `month`.  
**Not a filter:** `page` (pagination only) — parsed via `parseListingPage()`.

### Routes

| App path | Public URL (local) | Robots |
|----------|-------------------|--------|
| `/` | `/` | From `searchParams` |
| `/[slug]` | `/[slug]` | Always index, follow |
| `[...segments]` | unknown multi-segment | → `notFound()` |

### Related docs

- `CLAUDE.md` — AEO/GEO metadata contract for post pages.
- `.cursor/rules/blog.mdc` — quick rules for this app.

---

## PROD-1506 — Blog 404 + recovery rail (implemented)

**Jira:** [PROD-1506](https://dotdirect.atlassian.net/browse/PROD-1506) — S2.10 Blog 404 page

**Schema source:** `apps/studio/schemas` (`post`, `blogCategory`, `author.photo`) — not `studio-old` or stub `packages/sanity` post schema.

### What was shipped

| Deliverable | Location |
|-------------|----------|
| Global 404 | `src/app/not-found.tsx` — `noindex, follow` via `getBlogRobotsDirective({ kind: 'error' })` |
| Blog GROQ | `packages/sanity/src/queries/blog.ts` — categories + popular posts (month window, `publishedAt` fallback) |
| Data helpers | `src/lib/blog-data.ts`, `src/lib/blog-categories.ts` (studio slug fallback) |
| Recovery rail (reuse PROD-1503) | `src/app/_components/` — search, chips, popular rail, RFQ CTA, newsletter |
| Newsletter API | `src/app/api/newsletter/route.ts` — needs `NEWSLETTER_WEBHOOK_URL` |
| Author image field | `POST_BY_SLUG_QUERY` uses `author.photo` (studio `author` schema) |

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

| Deliverable | Location |
|-------------|----------|
| Home page rebuild | `src/app/page.tsx` — hero, industries, 5 category rows, newsletter, pillars, RFQ |
| Home data + order | `src/lib/blog-home.ts` — category slug order per AC |
| GROQ | `packages/sanity/src/queries/blog.ts` — featured, latest, by category, industries |
| Components | `home-hero`, `home-industry-strip`, `home-category-row`, `home-conversion-pillars`, `post-card` |
| Studio pin field | `apps/studio/schemas/post.ts` — `featuredOnHome` |
| Blog JSON-LD | `@pakfactory/seo` — `blog()` generator |
| Seed | `featuredOnHome: true` on `post-paperboard-guide` |

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

| Item | Value |
|------|--------|
| `apps/blog/package.json` | `next dev --port ${PORT:-3003}` |
| `site.ts` fallback origin | `http://localhost:3003` when `NEXT_PUBLIC_SITE_URL` unset |
| Public URL | **`http://localhost:3003/`** (home at root; do not append `/blog`) |

Do not use port **3001** unless you set `PORT=3001` explicitly (another service may already use 3001).

### Environment loading (critical)

The blog app must see Sanity credentials at **runtime**. Three layers work together:

| Layer | File / config | Role |
|-------|----------------|------|
| Turbo | `turbo.json` → `dev.env` | Declares env keys for hashing only (Turbo does not load `.env` files) |
| Next | `apps/blog/next.config.ts` | `loadEnvConfig(repoRoot)` via `import.meta.url` (not `process.cwd()`) |
| Override | `apps/blog/.env.local` | Optional; **recommended** copy of `NEXT_PUBLIC_SANITY_*` + `SANITY_API_READ_TOKEN` |

**Studio is different:** `apps/studio/.env.local` is read by Vite only — keep `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET` aligned with root (see `apps/studio/.env.example`).

**Symptom:** dev yellow banner — *Project: (missing) · Token: missing · Configured: no* → blog never loaded root `.env.local`. Fix `apps/blog/.env.local` and restart.

### Sanity dataset (local)

| Setting | Local dev value |
|---------|------------------|
| Project | `8293wrxp` (team project; match root `.env.local`) |
| Dataset | **`development`** (not `production` for day-to-day dev) |

Root `.env.example` defaults to `development`. Production dataset is for Vercel prod / preview only.

### Seed commands

| Command | What it writes |
|---------|----------------|
| `pnpm --filter @pakfactory/studio run seed` | Full catalog (~163 docs): capabilities, products, blog taxonomy, 3 base posts, settings. Idempotent `createOrReplace`. Reads root `.env.local`. |
| `pnpm seed:blog-dev` | Supplement: 12 extra posts (≥3 per category for home rows) + 5 industries. Script: `apps/studio/scripts/seed-blog-dev.mjs`. |

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

| Item | Location |
|------|----------|
| Yellow empty-state banner | `page.tsx` when zero posts in development |
| `noStore()` in dev | `blog-home.ts` — avoids stale empty RSC cache |
| `getBlogHomeDebugInfo()` | `blog-home.ts` — project/dataset/token for banner |

Remove or narrow the banner once local CMS connection is stable.

---

## PROD-1499 — Category archives (`/category/[slug]`)

**Jira:** [PROD-1499](https://dotdirect.atlassian.net/browse/PROD-1499) — S2.3 Category landing pages — **Request For Approval** (2026-05-19)

| Deliverable | Location |
|-------------|----------|
| Page 1 | `src/app/category/[slug]/page.tsx` |
| Page 2+ | `src/app/category/[slug]/page/[n]/page.tsx` |
| Post detail | `src/app/category/[slug]/[postSlug]/page.tsx` |
| Post URLs | `src/lib/blog-post-url.ts` (`postDetailHref`) |
| Shared post logic | `src/lib/blog-post.ts`, `blog-post-article.tsx` |
| Data | `src/lib/blog-category-archive.ts` |
| JSON-LD | `src/lib/category-archive-jsonld.ts` |
| UI | `category-archive-view`, `category-filter-sidebar`, `category-active-filters`, `PostCard` `headline` variant |

**QA (post URL bugfix):** From `/category/business-strategy`, cards link to `/category/business-strategy/{postSlug}` (not `/{postSlug}`). Legacy `/{postSlug}` redirects when category is known.

```bash
open http://localhost:3003/category/packaging-news
open http://localhost:3003/category/business-strategy/tco-folding-cartons-vs-rigid
open http://localhost:3003/category/trends?tag=some-tag
```

---

## PROD-1498 — All posts archive (`/all`)

**Jira:** [PROD-1498](https://dotdirect.atlassian.net/browse/PROD-1498) — S2.2 All posts archive with pagination

| Deliverable | Location |
|-------------|----------|
| Page 1 | `src/app/all/page.tsx` |
| Page 2+ | `src/app/all/page/[n]/page.tsx` |
| Data | `src/lib/blog-archive.ts` |
| JSON-LD | `src/lib/all-archive-jsonld.ts` |
| UI | `_components/all-posts-archive.tsx`, `archive-filter-sidebar.tsx`, `archive-pagination.tsx` |

```bash
open http://localhost:3003/all
curl -sI http://localhost:3003/all/page/99 | head -5  # expect 404 when out of range
```

---

## PROD-1505 — RSS feed (`/rss.xml`)

**Jira:** [PROD-1505](https://dotdirect.atlassian.net/browse/PROD-1505) — S2.9 Build RSS feed

| Deliverable | Location |
|-------------|----------|
| Route handler | `src/app/rss.xml/route.ts` |
| XML builder | `src/lib/rss.ts` |
| GROQ | `BLOG_RSS_POSTS_QUERY` in `@pakfactory/sanity/queries` |
| Autodiscovery | `src/app/layout.tsx` → `metadata.alternates.types` |
| Shared revalidate | `src/lib/blog-cache.ts` (`BLOG_REVALIDATE_SECONDS = 60`) |

```bash
curl -s http://localhost:3003/rss.xml | head -20
curl -sI http://localhost:3003/rss.xml | grep -i content-type
```

## Tag grouping — `tagGroup` axes (Studio taxonomy, no ticket yet)

Tags stay **flat** (`blogTag`, URL `/blog/tag/{slug}`). Grouping is a **pure classification**
on a `tagGroup` string field — no nested document types, no grouping encoded in slugs or titles.

| Concern | Location |
|---------|----------|
| **Source of truth** — axis vocabulary | `TAG_GROUPS` in `apps/studio/schemas/blogTag.ts` |
| Ungrouped sentinel value (`"ungrouped"`) | `TAG_GROUP_UNGROUPED` in same file |
| `tagGroup` + `order` fields (radio, `initialValue: 'ungrouped'`) | `apps/studio/schemas/blogTag.ts` |
| Studio browse lists (per-axis + Ungrouped + All) | `apps/studio/structure/index.ts` (imports `TAG_GROUPS`) |
| Seeded tag → axis assignments | `apps/studio/scripts/seed.mjs` (`blogTags`) |
| Front-end facet projection (`tagGroup`, `order`) | `BLOG_CATEGORY_TAGS_FACET_QUERY` in `@pakfactory/sanity/queries`; type `CategoryFacetTag` in `src/lib/blog-category-archive.ts` |

**Current axes (7 of 11):** `material`, `packaging-type`, `finish`, `industry`, `channel`,
`design-style`, `topic`. The canonical 11-axis Tagging Reference is not yet in-repo; add the
remaining 4 to `TAG_GROUPS` when finalized.

**To add/rename an axis:** edit `TAG_GROUPS` only — the dropdown, the Studio sub-list, and the
facet projection all derive from it. Never change an existing `value` after tags use it (orphans
them into Ungrouped); renaming `title` is safe.

**Gotcha:** `S.documentTypeList('blogTag').filter(...)` **replaces** the built-in `_type`
constraint, so every custom tag filter in `structure/index.ts` must include `_type == "blogTag"`
explicitly (else it matches all types and breaks orderings — e.g. `author` has no `title`).

**Front-end note:** facet query projects `"ungrouped"` for unclassified tags; treat it as
"no group" at render (or filter it out of the facet query later).

---

## PROD-1596 — Centralize blog URL base (subpath readiness)

**Jira:** [PROD-1596](https://dotdirect.atlassian.net/browse/PROD-1596) — Centralize blog URL base for subpath readiness — child of PROD-1482 (Blog App Routes)

**Why:** Product direction is to host the blog at **`pakfactory.com/blog`** (subpath; `www` at root) via Next.js **multi-zones**, while keeping origin-root/subdomain working today. `basePath` prefixes `next/link` + framework assets but **not** hand-built absolute URLs, so canonicals/JSON-LD/RSS would emit wrong paths under `/blog`. One source of truth makes the flip a config change.

### What was shipped

| Deliverable | Location |
|-------------|----------|
| `BLOG_BASE_PATH` + `absoluteUrl()` / `siteBaseUrl()` / `sitePath()` | `src/lib/site.ts` |
| Canonicals + OG via helper | `app/page.tsx`, `app/all/page.tsx`, `app/all/page/[n]`, `app/category/[slug]/page.tsx`, `app/category/[slug]/page/[n]` |
| JSON-LD via helper | `lib/category-archive-jsonld.ts`, `lib/all-archive-jsonld.ts`, `lib/blog-post.ts` (post + breadcrumbs) |
| RSS channel/item links | `app/rss.xml/route.ts` passes `siteBaseUrl()`; `lib/rss.ts` unchanged |
| RSS autodiscovery (relative) | `app/layout.tsx` → `sitePath("/rss.xml")` |
| **New** XML sitemap | `app/sitemap.ts` (+ `BLOG_SITEMAP_POSTS_QUERY` in `@pakfactory/sanity/queries`) |
| Env docs | root + `apps/blog/.env.example` → `NEXT_PUBLIC_BLOG_BASE_PATH` |

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

**Schema:** flat `blogTag` (`title`, `slug`, `tagGroup`, `order`, `description`, `meta*`, `ogImage`); `post.tags[]->blogTag`. Axis vocabulary = `tagGroup` (see [Tag grouping](#tag-grouping--taggroup-axes-studio-taxonomy-no-ticket-yet) section). **No schema edits** — T1.2 already added `tagGroup`.

### What was shipped

| Deliverable | Location |
|-------------|----------|
| Page 1 | `src/app/tag/[slug]/page.tsx` |
| Page 2+ (`/page/1` → `/tag/[slug]`) | `src/app/tag/[slug]/page/[n]/page.tsx` |
| Data | `src/lib/blog-tag-archive.ts` |
| Axis labels (mirror of studio `TAG_GROUPS`) | `src/lib/tag-groups.ts` |
| JSON-LD | `src/lib/tag-archive-jsonld.ts` |
| Robots (empty→noindex) | `getTagListingRobots()` in `src/lib/seo.ts` |
| UI | `_components/tag-archive-view`, `tag-filter-sidebar`, `tag-active-filters`, `tag-archive-pagination`; reuse `PostCard` |
| GROQ | `BLOG_TAG_BY_SLUG_QUERY`, `BLOG_TAG_POSTS_{COUNT,PAGE_NEWEST,PAGE_OLDEST,PAGE_TITLE}_QUERY`, `BLOG_TAG_COOCCURRING_TAGS_QUERY`, `BLOG_TAG_AUTHORS_FACET_QUERY` in `@pakfactory/sanity/queries` |

### Behavior

- **Kicker:** `tagGroupTitle(tag.tagGroup)` → e.g. `INDUSTRY`; omitted when `ungrouped`/unknown.
- **Sidebar:** co-occurring tags (other tags on this tag's posts) grouped by axis; **the current tag's own axis row is hidden** (e.g. Industry hidden on `/tag/beauty`); empty axes omitted. Plus author + date + sort. Filter state (`author`, `year`, `month`, `sort`) in URL — **`tag` is the page, not a filter**.
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

## PROD-1597 — Remove `/category/` prefix from blog URLs (implemented)

**Jira:** [PROD-1597](https://dotdirect.atlassian.net/browse/PROD-1597) — requirement update for PROD-1499.

**New scheme:** category archives at `/{category}`; posts at `/{category}/{post-slug}`. No `/category/` prefix, **no bare root post route** (the old `[slug]` redirect route is deleted).

| Concern | Location |
|---------|----------|
| Route tree | `src/app/[category]/page.tsx` (archive), `[category]/page/[n]/` (pagination), `[category]/[postSlug]/` (post) |
| Param name | `category` (was `slug`); post page aliases `category: categorySlug` |
| URL builders | `categoryHref(slug)` + `postDetailHref(post, cat)` in `src/lib/blog-post-url.ts`; `categoryPageHref` in `src/lib/blog-category-archive.ts` |
| 301 redirects | `next.config.ts` `redirects()` — `/category/:c[/page/:n][/:post]` → new paths (permanent) |

**Guards:** `[category]/page.tsx` `notFound()`s unknown/reserved single segments via `isKnownCategorySlug` (static routes `/all`, `/rss.xml`, `/api`, etc. win over the dynamic segment anyway). A post slug must never equal a category slug or reserved segment.

**Derived surfaces auto-update** through the two helpers: canonicals, breadcrumb/collection JSON-LD, RSS `<link>`, and the sitemap (`BLOG_SITEMAP_POSTS_QUERY` via `postDetailHref`).

### Verification

```bash
pnpm --filter @pakfactory/blog typecheck && pnpm build:blog
# /trends, /trends/{post}, /trends/page/2 resolve; /category/trends/{post} 301s; bare /{post} 404s.
```
