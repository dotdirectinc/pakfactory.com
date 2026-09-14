# CLAUDE.md — `@pakfactory/www`

Inherits root [`CLAUDE.md`](../../CLAUDE.md) and [`AGENTS.md`](../../AGENTS.md). This file adds **www-app** conventions only.

## Identity

PakFactory **marketing site rebuild** — consultative packaging sales (quote / RFQ / contact), **not** e-commerce. PR base: **`www-new-release`**.

## Routes (Next.js App Router)

| Route group | Path prefix | Notes |
| ----------- | ----------- | ----- |
| `(site)` | `/`, `/products`, `/solutions`, `/capabilities`, `/expertise`, `/contact`, `/about`, `/policies`, `/bundles`, `/request` | Marketing pages; Sanity-backed catalog |
| `(auth)` | `/login`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify` | Buyer auth via Supabase |
| `(account)` | `/account`, `/account/profile`, `/account/requests` | Authenticated buyer area — off-white header + white `rounded-t-xl` main ([`account-shell.tsx`](src/components/account/account-shell.tsx)); `/account/requests` is a data table ([`account-request-list.tsx`](src/components/account/account-request-list.tsx)) |
| `(request)` | `/request/products`, `/request/general`, `/request/services` | RFQ flows |
| `case-studies` | `/case-studies`, `/case-studies/[slug]` | Case study listing + detail; draft mode under `/case-studies/api/draft-mode/` |
| API | `/api/revalidate`, `/api/wm`, `/api/dev/sanity-check` | Revalidate webhook, watermark, dev helpers |
| Meta | `/robots.txt`, `/sitemap.xml`, `/llms.txt` | SEO / crawler surfaces |

Use **Server Components** by default. Do not add cart or checkout UX unless explicitly requested by product.

## Auth

- **Supabase** via `@pakfactory/supabase` (SSR client + session helpers)
- Shared login UI via `@pakfactory/auth-ui` (props-only; www owns wiring)
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` in **repo root** `.env.local`
- Auth email templates: [`docs/auth-emails/README.md`](./docs/auth-emails/README.md)

## Sanity

- Queries from `@pakfactory/sanity/queries`; `getSanityClient()` pattern in `src/lib/sanity/`
- Revalidate: `/api/revalidate` with `SANITY_REVALIDATE_SECRET`
- Presentation preview enable route: `/case-studies/api/draft-mode/enable`

## SEO and indexing

- JSON-LD via **`@pakfactory/seo`** — never hand-author schema.org objects in route files
- Non-production responses: `X-Robots-Tag: noindex, nofollow` via `next.config.ts` headers
- [`robots.txt`](./src/app/robots.txt/route.ts): blanket `Disallow: /` on non-production
- `WWW_DISABLE_INDEXING` kill-switch for preview deploys

## Component organization (ADR-005)

- `src/` = `app/`, `components/`, `lib/` only
- `app/` is routing-only; importable components live under `src/components/`
- **Known deferred violation:** `app/case-studies/_components/` and `app/case-studies/[slug]/_components/` — remediation deferred per [ADR-005](../../docs/adr/0005-component-organization.md); do not add new `_components/` folders elsewhere
- **Reuse (ADR-013):** props-only shared UI (`components/ui/`, `@pakfactory/ui`); features own data/URL wiring in `lib/` / modules — never fork or cross-import feature controllers. Extract shared cores (e.g. `CatalogCard`) instead of duplicating tiles.

## Composition: chrome vs structured routes vs Sections

Do **not** collapse these layers:

| Layer | Owns | www practice |
| ----- | ---- | ------------ |
| **Site chrome** | Global nav / footer | Layout + modules; Sanity `websiteNavigation` singleton (not `sections[]`) |
| **Structured routes** | Catalog URL trees | Code owns breadcrumb, H1, primary grids/cards (`/products…`, `/solutions…`); optional `doc.sections` only as a body slot |
| **Sections** | Editor page body | Studio `schemas/sections/` + `pageSectionsField(SECTION_ALLOW.*)`; presentation-free (D35); allowlisted per page type |
| **Design system** | Tokens / primitives | [`DESIGN.md`](../../DESIGN.md) + ADR-006; do not edit existing `packages/ui` primitives for features |

**Route gate (challenge before adding Sections):**

- Chrome (nav/footer/breadcrumbs)? → **not** a section.
- URL hierarchy / filters / RFQ rails? → **code skeleton**; do not replace with free page builder.
- Editorial layout that editors must reorder? → **section** type + shared renderer, allowlist updated.
- New visual band that is only “grey background / 3 columns”? → reject (presentation in CMS); keep in design system / code.

www prefers **Sections** language for page composition ([ADR-015](../../docs/adr/0015-page-composition-sections-terminology.md) Proposed). Blog still uses **block** / `pageBuilder` until ADR-015 Accepted + PROD-2293 — do not rename blog fields in www PRs.

**Blog:** no change required for www chrome or SectionRenderer work.

## Staging and deploy

- **Stakeholder staging:** [staging.pakfactory.com](https://staging.pakfactory.com) — latest `www-new-release` build on Vercel `pakfactory-com` project (preview deployment, Vercel Authentication wall)
- **QA alias:** git-branch preview on `www-new-release` (see root `AGENTS.md` § www rebuild trunk)
- Ops detail: [`memory.md`](./memory.md)

## Local dev

- `pnpm dev:www` from repo root → **http://localhost:3003**
- `pnpm start` (after build) → port **3000**
- Env: repo root `.env.local` via `loadEnvConfig` in `next.config.ts` (`forceReload: true`); optional overrides in `apps/www/.env.local` — see [`.env.example`](./.env.example)

## Packages

| Package | Role |
| ------- | ---- |
| `@pakfactory/sanity` | GROQ queries, shared content types |
| `@pakfactory/seo` | JSON-LD generators |
| `@pakfactory/ui` | Design tokens and primitives — do not edit for features |
| `@pakfactory/components` | Shared marketing blocks |
| `@pakfactory/supabase` | Auth client + session |
| `@pakfactory/auth-ui` | Shared login form (props-only) |
