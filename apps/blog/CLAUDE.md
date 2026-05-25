# CLAUDE.md — `@pakfactory/blog`

Inherits root [`CLAUDE.md`](../../CLAUDE.md) and [`AGENTS.md`](../../AGENTS.md). This file adds **blog-app** conventions only.

## Routes (Next.js App Router)

| Route | File | Notes |
|-------|------|--------|
| `/blog` (`basePath`) | [`src/app/page.tsx`](./src/app/page.tsx) | Post index; `revalidate = 60` |
| `/blog/[slug]` | [`src/app/[slug]/page.tsx`](./src/app/[slug]/page.tsx) | Single post |
| Future | `src/app/category/[slug]/...` | Reserved for category archives — no client-only routing for primary content |

Use **Server Components** by default. Do not replace content navigation with client-side routers for SEO-critical pages.

## Public URLs and `basePath` (PROD-1496)

- Next.js **`basePath`** is **`/blog`** ([`src/lib/base-path.ts`](./src/lib/base-path.ts) — keep in sync with `next.config.ts`).
- App routes remain `/` and `/[slug]` in code; public URLs are **`/blog`** and **`/blog/[slug]`** (Next prefixes `basePath` on links automatically).
- **`getSiteUrl()`** in [`src/lib/site.ts`](./src/lib/site.ts) must return the **full public origin including `/blog`** (e.g. `http://localhost:3003/blog`, `https://pakfactory.com/blog`). Set **`NEXT_PUBLIC_SITE_URL`** in root or `apps/blog/.env.local`.
- **Local dev URL:** [http://localhost:3003/blog](http://localhost:3003/blog) (default `PORT=3003` in `package.json`). Ops, env, and seed: [`memory.md`](./memory.md) § Local dev.
- Use `getSiteUrl()` + `normalizeSiteUrl()` for canonicals, Open Graph URLs, and JSON-LD — never hardcode `localhost:3001` without `/blog`.
- Vercel deployment checklist: [`memory.md`](./memory.md).

## Listing robots (PROD-1495)

- Use **`getBlogRobotsDirective`** / **`getListingRobotsFromSearchParams`** from [`src/lib/seo.ts`](./src/lib/seo.ts) in **`generateMetadata`** on listing routes (index today; future category/tag/author archives).
- **Post pages:** always **index, follow** (`kind: 'post'`).
- **Listings:** page **1** with no filter query params → **index, follow**; page **≥ 2** or any filter param (`tag`, `category`, `q`, `query`, `author`, `year`, `month`) → **noindex, follow**. Pagination uses **`page` only** — `page` is not a filter.

## Sanity query patterns

- Import queries from **`@pakfactory/sanity/queries`** only — do **not** inline raw GROQ strings in route files.
- All shared queries must use **`defineQuery`** in `packages/sanity`.
- Use **`getSanityClient()`** from [`src/sanity/client.ts`](./src/sanity/client.ts).
- Guard fetches with **`isSanityConfigured()`** from [`src/sanity/env.ts`](./src/sanity/env.ts) when the app must render without env (see index page pattern).
- Default caching: **`export const revalidate = 60`** unless product requires a different TTL.

## AEO / GEO — metadata and schema (targets for new/updated post pages)

Every post detail route should:

1. **`generateMetadata`**: full **title**, **description**, **Open Graph** (`og:title`, `og:description`, `og:image`, `og:type=article`), and **Twitter** card fields aligned with the content.
2. **JSON-LD**: `<script type="application/ld+json">` using **`@pakfactory/seo`** (`blogPosting`, `organization`, `person`, `breadcrumbList`, `serializeJsonLd`, etc.) — **never** hand-author schema.org objects inline in route files.
3. **GEO-friendly body structure**: answer-first lead paragraph; descriptive **H2**/**H3**; optional **FAQ** section with matching **`FAQPage`** JSON-LD when the page lists Q&A pairs (add a generator in `@pakfactory/seo` when needed).
4. **Author**: surface author name (and bio link when content model supports it) for entity clarity.

Canonical URL base: **`NEXT_PUBLIC_SITE_URL`** (must include `/blog` path prefix). Treat this section as the **contract** for AI-generated implementations.

**Jira map:** [`docs/blog-3-jira-conventions.md`](../../docs/blog-3-jira-conventions.md).

## Components and files

- **File naming:** kebab-case for components (e.g. `post-header.tsx`, `portable-body.tsx`).
- **Colocation:** put route-specific components under `src/app/<segment>/_components/`; share across routes via **`@pakfactory/ui`** or small shared modules under `src/components/` only when reused.
- **Styling:** use tokens from **`@pakfactory/ui/globals.css`**; do not extend `globals.css` with new tokens or `@theme` blocks for features.
- **UI primitives (`@pakfactory/ui`):** Prefer existing shadcn-style components for interactive and marketing surfaces — e.g. **`Card`** (+ `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`) for bands and pillar layouts, **`Button`** for CTAs, **`Badge`** for chips/pills, **`Input`** for forms. Avoid raw bordered `div`s when a matching primitive exists; keep one-off layout in app `_components/` with `className` only.

## Active skills (Claude Code)

For blog writing and SEO tasks, prefer the in-repo skills registered in root [`CLAUDE.md`](../../CLAUDE.md): **seo-content-writer**, **on-page-seo-auditor**, **geo-content-optimizer**.
