# `@pakfactory/blog`

The PakFactory blog — a **Next.js 16 (App Router) + React 19** front end, editorially driven by **Sanity** (`apps/studio`) and built on the shared `@pakfactory/*` packages. It is one app in the `pakfactory.com` Turborepo.

> **Working with an AI agent (Claude Code / Cursor)?** Read [`CLAUDE.md`](./CLAUDE.md) and the repo [`AGENTS.md`](../../AGENTS.md) first — they are the canonical conventions. This README is the human onboarding entry point; `CLAUDE.md` + [`memory.md`](./memory.md) hold the deep detail.

## Stack

- **Next.js 16** App Router, **React 19**, **TypeScript**, **Tailwind CSS v4**
- **Sanity** via [`next-sanity`](https://github.com/sanity-io/next-sanity) + `@sanity/visual-editing`; content modelled in `apps/studio`
- Shared workspace packages: **`@pakfactory/sanity`** (GROQ queries + client), **`@pakfactory/seo`** (JSON-LD + metadata generators), **`@pakfactory/ui`** (cross-app design-system primitives + tokens)
- Tooling: **pnpm** (`pnpm@9.15.0`), **Turborepo**, ESLint, `tsc`

## Getting started

All commands run from the **repo root** unless noted. Use **pnpm** only (never npm/yarn).

```bash
pnpm install
pnpm dev:blog          # turbo run dev --filter=@pakfactory/blog → http://localhost:3003
```

You'll usually also want the Studio running to edit content:

```bash
pnpm dev:studio        # Sanity Studio (apps/studio)
```

| Task | Command |
|------|---------|
| Dev server | `pnpm dev:blog` (or `pnpm --filter @pakfactory/blog dev`) |
| Production build | `pnpm build:blog` |
| Type-check | `pnpm --filter @pakfactory/blog typecheck` |
| Lint | `pnpm --filter @pakfactory/blog lint` |
| Seed dev content | `pnpm --filter @pakfactory/studio run seed` then `pnpm seed:blog-dev` (see [Content vs seed](#content-vs-seed-workflow) — seeds **push** fixtures into Sanity; they are not a content pull) |

After seeding, open Studio → **Pages → Homepage** → **Page blocks** tab to reorder blocks.

Local URL is **`http://localhost:3003/`** — the home page is at the root, **not** `/blog` (the `/blog` prefix is a hosting concern, see [URL scheme](#routing--url-scheme)). Don't use port 3001/3000.

### Environment

Sanity credentials are read at **runtime** and loaded from the **repo-root `.env.local`** by `next.config.ts` (`loadEnvConfig`). If the dev banner shows `Project: (missing)`, copy these into `apps/blog/.env.local`:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=   # the team project (see root .env.example)
NEXT_PUBLIC_SANITY_DATASET=development   # use `development` for day-to-day dev, not `production`
SANITY_API_READ_TOKEN=
```

Other env (see [`.env.example`](./.env.example) for the full list): `NEXT_PUBLIC_SITE_URL` (origin only, no path), `NEXT_PUBLIC_BLOG_BASE_PATH` (empty today; `/blog` under subpath hosting), `SANITY_REVALIDATE_SECRET` (Sanity→`/api/revalidate` webhook), `CONTRIBUTE_WEBHOOK_URL` / `NEWSLETTER_WEBHOOK_URL` (form proxies).

## Project structure

`src/` is exactly **`app/ components/ lib/`** (ADR-005). Nothing else at the root.

```
src/
├─ app/            Routing ONLY — page.tsx / route.ts / layout.tsx / sitemap.ts …
│                  Single-route whole-page views are inlined here (ADR-007).
├─ components/     All application UI, grouped by ARCHETYPE/LAYER (ADR-008):
│  ├─ blocks/      Page-builder blocks — mirror Studio schemas/blocks/ 1:1
│  ├─ layout/      Site chrome — nav, footer, breadcrumb, page frame
│  ├─ views/       Multi-route route-level templates (archives, author header)
│  ├─ modules/     Sanity-data-driven building blocks (cards, filters, forms)
│  └─ ui/          App-local primitives (NOT the cross-app @pakfactory/ui package)
└─ lib/            Everything non-visual — data fetching, SEO, URL builders,
                   lib/sanity/{client,env}
```

Components are imported via `@/components/<archetype>/<file>`; file name **===** exported component (`post-card.tsx` ↔ `PostCard`). See [`CLAUDE.md` § Components](./CLAUDE.md) and **ADR-008** for the full rule.

## Routing & URL scheme

Server Components by default; `export const revalidate = 60` unless a route needs otherwise. The live route table lives in [`CLAUDE.md`](./CLAUDE.md) (kept in sync with the BA route design).

- A **post's only URL is `/{slug}`** (root). Category / tag / search / home are *discovery paths*, never URL scoping — legacy `/{category}/{slug}` URLs permanently redirect (PROD-1597).
- The single root segment `/[category]` resolves to a **category archive** (known slug) or otherwise a **post**; unknown → `notFound()`.
- **Reserved segments:** `all`, `rss.xml`, `sitemap.xml`, `api`, `search`, `tag`, `author`, `contribute`. A post slug must never collide with these.
- **Build URLs only via `src/lib/site.ts`:** `absoluteUrl(path)` (canonicals, JSON-LD, RSS, sitemap) and `sitePath(path)` (relative metadata). Never concatenate `getSiteUrl()` with a raw path — that skips the `basePath` prefix under subpath hosting.
- **Listing routes** are `index, follow` when unfiltered (including page ≥2, each self-canonical); `noindex, follow` when any filter query param or non-default `?perPage=` is present; post pages are always indexable (`getBlogRobotsDirective`, PROD-1495).

## Sanity & content

- Import GROQ from **`@pakfactory/sanity/queries`** only — no inline GROQ in route files. Shared queries use `defineQuery` in `packages/sanity`.
- Use `getSanityClient()` from `src/lib/sanity/client.ts`; guard with `isSanityConfigured()` from `src/lib/sanity/env.ts` so the app renders without env.
- Content schemas live in **`apps/studio/schemas`** (the source of truth for `post`, `blogCategory`, `blogTag`, `author`, etc.). Changing a schema is a Studio concern — coordinate before editing.

### Content vs seed workflow

**You do not pull editorial content from Sanity into git before building.** Content lives in the dataset; `pnpm dev:blog` reads it live via the API. Point `.env.local` at the same project + dataset as Studio (`development` for local dev) and refresh.

**Seeding pushes the other way** — fixture scripts overwrite known document IDs in Sanity. Use seeds only when the dataset is empty or you need repeatable QA data; avoid running them while editors are working on the same dataset. **AI agents do not run seeds** — humans only ([`AGENTS.md`](../../AGENTS.md) § Sanity content — agent guardrails).

| When | Command |
| ---- | ------- |
| Fresh clone / empty dataset | `pnpm --filter @pakfactory/studio run seed` |
| Home rows need posts + full blog fixtures | `pnpm seed:blog-dev` |
| Empty homepage/topics page builder only | `pnpm --filter @pakfactory/studio run seed:blog-singleton-pages` |

Full workflow (draft preview, export/import, rules of thumb): [`memory.md` § Content vs seed workflow](./memory.md#content-vs-seed-workflow).

## SEO / AEO / GEO

Post pages must ship full `generateMetadata` (title, description, Open Graph, Twitter) and JSON-LD built with **`@pakfactory/seo`** generators (`blogPosting`, `organization`, `person`, `breadcrumbList`, …) — never hand-author schema.org objects inline. See the contract in [`CLAUDE.md` § AEO/GEO](./CLAUDE.md).

## Page blocks (shipped)

The homepage is a **Sanity page builder** on the `blogPage` home singleton (`pageRole: home`, id `blogHomePage`). Landing/static pages are separate `blogPage` documents with `pageBuilderLanding` (ADR-009). Wiring: `BLOG_HOME_PAGE_BUILDER_QUERY` / `BLOG_PAGE_BY_SLUG_QUERY` → `BlockRenderer` + [`registry.ts`](./src/components/blocks/registry.ts). Resolver at `/{slug}`: category → CMS page → post.

Studio: Blog workspace → **Pages → Homepage** (landing/static lists inside Pages gated until `BLOG_STUDIO_LANDING_PAGES`). Humans: see [`memory.md`](./memory.md) for seed commands when bootstrapping.

## Architecture decisions

Decisions live in [`docs/adr/`](../../docs/adr/) (register: [`README.md`](../../docs/adr/README.md)). Most relevant here:

- **ADR-005** — routing-only `app/`, naming rules (file === export).
- **ADR-006** — design tokens centralized in `@pakfactory/ui/globals.css`; apps import, never define tokens.
- **ADR-007** — single-route whole-page views are inlined in `page.tsx`; multi-route views are components.
- **ADR-008** — `components/` grouped by archetype/layer; `blocks/` mirrors Studio `schemas/blocks/`.
- **ADR-009** — `blogPage` content model (home singleton, landing/static pages, URL resolver).

## Verify before committing

```bash
pnpm --filter @pakfactory/blog typecheck && pnpm build:blog
```

## Deploy

Vercel project with **Root Directory `apps/blog`** and "Include files outside root" on. Install `pnpm install --frozen-lockfile`; build `pnpm turbo run build --filter=@pakfactory/blog`; ignore unchanged via `turbo-ignore`. The blog serves at the **deployment root** (no `basePath`); production `NEXT_PUBLIC_SITE_URL` is the blog origin (e.g. `https://blog.pakfactory.com`). Full checklist in [`memory.md`](./memory.md) (PROD-1496).

## Where to look next

- [`CLAUDE.md`](./CLAUDE.md) — canonical app conventions (routes, Sanity, SEO, components)
- [`memory.md`](./memory.md) — feature-by-feature implementation log, ops, seeding, troubleshooting
- [`AGENTS.md`](../../AGENTS.md) — repo-wide stack, ADR summary, JIRA defaults
- [`docs/adr/`](../../docs/adr/) — architecture decision records
