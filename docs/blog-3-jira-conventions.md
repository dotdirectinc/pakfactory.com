# Blog 3.0 — Jira → repo conventions (for humans and AI)

This document maps **done** Blog 3.0 dev tickets to **binding** patterns in the monorepo. AI tools should treat it as an extension of [`AGENTS.md`](../AGENTS.md).

| Jira | Summary | Status | Where enforced |
|------|---------|--------|----------------|
| [PROD-1480](https://dotdirect.atlassian.net/browse/PROD-1480) | Epic — Tech Prerequisites | Done | This doc + `AGENTS.md` |
| [PROD-1486](https://dotdirect.atlassian.net/browse/PROD-1486) | T0.1 — pnpm migration (ADR-002) | Done | Root `package.json`, `pnpm-workspace.yaml`, `AGENTS.md` |
| [PROD-1487](https://dotdirect.atlassian.net/browse/PROD-1487) | T0.2 — `@pakfactory/seo` | Done | [`packages/seo`](../packages/seo/), [`packages/seo/CLAUDE.md`](../packages/seo/CLAUDE.md) |
| [PROD-1516](https://dotdirect.atlassian.net/browse/PROD-1516) | Standardize AI IDE config | Done | [`AGENTS.md`](../AGENTS.md), [`CLAUDE.md`](../CLAUDE.md), [`.cursor/rules/`](../.cursor/rules/), [`.claude/skills/`](../.claude/skills/) |
| [PROD-1495](https://dotdirect.atlassian.net/browse/PROD-1495) | T5.2 — Listing `noindex` rules | Done | [`apps/blog/src/lib/seo.ts`](../apps/blog/src/lib/seo.ts), [`apps/blog/CLAUDE.md`](../apps/blog/CLAUDE.md) |
| [PROD-1496](https://dotdirect.atlassian.net/browse/PROD-1496) | T5.3 — Vercel + `basePath` `/blog` | Done | [`apps/blog/next.config.ts`](../apps/blog/next.config.ts), [`apps/blog/memory.md`](../apps/blog/memory.md) |
| [PROD-1506](https://dotdirect.atlassian.net/browse/PROD-1506) | S2.10 — Blog 404 + recovery rail | Done | [`apps/blog/src/app/not-found.tsx`](../apps/blog/src/app/not-found.tsx), [`apps/blog/src/app/_components/`](../apps/blog/src/app/_components/) |
| [PROD-1497](https://dotdirect.atlassian.net/browse/PROD-1497) | S2.1 — Blog home page | Done | [`apps/blog/src/app/page.tsx`](../apps/blog/src/app/page.tsx), [`apps/blog/src/lib/blog-home.ts`](../apps/blog/src/lib/blog-home.ts) |

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

- **`basePath`:** `/blog` — keep [`BLOG_BASE_PATH`](../apps/blog/src/lib/base-path.ts) in sync with `next.config.ts`.
- **`NEXT_PUBLIC_SITE_URL`:** must include the path prefix (e.g. `https://pakfactory.com/blog`, `http://localhost:3001/blog`) for canonicals and JSON-LD.
- **Vercel:** separate project, root `apps/blog`, install/build in [`apps/blog/vercel.json`](../apps/blog/vercel.json). Ops checklist: [`apps/blog/memory.md`](../apps/blog/memory.md).
- **Local URLs:** index `http://localhost:3003/blog`, post `http://localhost:3003/blog/<slug>` (default `PORT=3003`; see [`apps/blog/memory.md`](../apps/blog/memory.md)).

## PROD-1497 — Blog home

- **Route:** `apps/blog/src/app/page.tsx` (public `/blog`).
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

## JIRA workflow (Product project)

| Item | Convention |
|------|------------|
| **Project key** | `PROD` |
| **Issue prefix** | `PROD-123` |
| **Branches** | `feat/PROD-123-short-slug`, `fix/PROD-123-short-slug` |
| **Commits** | `PROD-123: summary` or trailer `Refs: PROD-123` |
| **PR titles** | `[PROD-123] Short description` |
