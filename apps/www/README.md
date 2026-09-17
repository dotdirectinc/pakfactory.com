# `@pakfactory/www`

Main PakFactory **marketing site rebuild** — Next.js 16 App Router, Sanity-backed catalog, buyer auth (Supabase), RFQ flows, and case studies.

> **Humans:** this README is the onboarding entry point for foundations, components, and where docs live.
> **AI agents:** also read [`CLAUDE.md`](./CLAUDE.md) and repo [`AGENTS.md`](../../AGENTS.md). Ops / Vercel: [`memory.md`](./memory.md).

## Quick start

From the **repo root**:

```bash
pnpm install
cp .env.example .env.local    # fill Sanity + Supabase values
pnpm dev:www                  # http://localhost:3003
```

Optional www-specific overrides: [`apps/www/.env.example`](./.env.example) → `apps/www/.env.local`.

Usually also run Studio for content editing:

```bash
pnpm dev:studio    # http://localhost:3333
```

| Task | Command |
| ---- | ------- |
| Dev server | `pnpm dev:www` |
| Production build | `pnpm build:www` |
| Type-check | `pnpm --filter @pakfactory/www typecheck` |
| Lint | `pnpm --filter @pakfactory/www lint` |

## PR base

www rebuild work merges into **`www-new-release`**, not `staging`. See root [`AGENTS.md`](../../AGENTS.md) § www rebuild trunk.

## Project structure

`src/` is **`app/` · `components/` · `lib/`** (ADR-005; www still carries some deferred layout notes in [`CLAUDE.md`](./CLAUDE.md)).

```
src/
├─ app/            Routing only — page.tsx / route.ts / layout.tsx …
├─ components/     Feature UI (see [Components](#components))
└─ lib/            Catalog fetch, cache tags, auth, routes, Sanity helpers
```

UI tokens and composition: root [`DESIGN.md`](../../DESIGN.md). RSC / placement practice: root [`ENGINEERING.md`](../../ENGINEERING.md).

## Foundations — Sanity catalog cache

Catalog pages **do not re-query Sanity on every filter click**.

| Concern | Behavior |
| --- | --- |
| **Fetch** | Server helpers in [`src/lib/catalog/catalog.ts`](./src/lib/catalog/catalog.ts): `listCustomizations()`, `listProducts()`, `listLines()`, etc. |
| **Cache** | Wrapped in Next `unstable_cache` with tags/TTLs from [`src/lib/www-cache.ts`](./src/lib/www-cache.ts) (`WWW_CATALOG_*`, ~**60s** catalog ISR floor, **300s** content safety-net). |
| **Bust** | Sanity webhook → `/api/revalidate` must call `revalidateTag(tag, "max")`. **Path-only** revalidation does **not** invalidate `unstable_cache`. |
| **Customizations filters** | One library payload on the server; **client-side** filter/search/facets over that list (no per-filter GROQ). How-built: [`docs/customizations-catalog.md`](./docs/customizations-catalog.md). |

Same cache tags cover products, product lines, solutions, and chrome (e.g. `websiteNavigation`) — see the constants in `www-cache.ts`.

## Components

Import via `@/components/<folder>/…`. Prefer **kebab-case file ≈ export**. Shared card chrome lives in `ui/` (ADR-013): **do not** import one feature’s controller into another — extract a props-only core to `ui/` / `lib/` instead.

| Folder | Role | Key surfaces |
| --- | --- | --- |
| [`customization/`](./src/components/customization/) | `/customizations` filterable library | `CustomizationCatalogView`, `CustomizationCatalogPanel`, filters (+ skeleton; shared + category facet slots), facet group, list (+ skeleton), `CustomizationCard` |
| [`product/`](./src/components/product/) | Product catalog + PDP | `ProductCatalogView` / line / style views, `ProductCard` (+ skeleton grid), detail, gallery, request rail |
| [`customization-builder/`](./src/components/customization-builder/) | Product configurator | builder shell, guided/workspace views, category rail, material/finish/print/dimension options |
| [`solution/`](./src/components/solution/) | Solutions catalog | `solution-views` |
| [`sections/`](./src/components/sections/) | Studio page sections | `customizations-catalog`, packaging / product / homepage heroes, advertisement card |
| [`request/`](./src/components/request/) | RFQ / brief builder | wizard steps, brief builder, product request card, express entry |
| [`account/`](./src/components/account/) | Buyer account area | `account-shell`, request list/detail, profile views |
| [`auth/`](./src/components/auth/) | Auth form primitives | card, form, field |
| [`login/`](./src/components/login/) | Auth route views | login / sign-up / forgot-password pages, Google button |
| [`layout/`](./src/components/layout/) | Site chrome | nav menu/dropdown, logo, footer wordmark, hero header, visual editing |
| [`common/`](./src/components/common/) | Shared page chrome | breadcrumb + page heading sections, confirm dialog |
| [`ui/`](./src/components/ui/) | App-local shared cores | `MediaCardFrame`, `MediaCardSkeleton`, gallery, bookmark, catalog card, toasts |
| [`modules/`](./src/components/modules/) | Older marketing blocks | product list/category, case study card, category filter, analytics tracker |
| [`views/`](./src/components/views/) | Multi-route templates | reserved (empty placeholder today) |

Detail for customizations wiring: [`docs/customizations-catalog.md`](./docs/customizations-catalog.md). Filter operators / product-line ids: [`docs/customization-filter-taxonomy.md`](./docs/customization-filter-taxonomy.md).

## Where to look next

| Doc | What it covers |
| --- | --- |
| [`CLAUDE.md`](./CLAUDE.md) | Routes, auth, SEO, composition rules (agents + humans) |
| [`memory.md`](./memory.md) | Vercel, staging, env troubleshooting |
| [`docs/customizations-catalog.md`](./docs/customizations-catalog.md) | Customizations library how-built (fetch → map → client filter) |
| [`docs/customization-filter-taxonomy.md`](./docs/customization-filter-taxonomy.md) | Filter facet operators and product-line vocabulary |
| [`docs/auth-emails/README.md`](./docs/auth-emails/README.md) | Supabase auth email templates |
| [`DESIGN.md`](../../DESIGN.md) | Design system / tokens |
| [`ENGINEERING.md`](../../ENGINEERING.md) | RSC, state, placement practice |
| [`AGENTS.md`](../../AGENTS.md) | Monorepo canon, PR base, Sanity guardrails |
