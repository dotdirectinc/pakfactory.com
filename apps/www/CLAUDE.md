# CLAUDE.md — `@pakfactory/www`

Inherits root [`CLAUDE.md`](../../CLAUDE.md) and [`AGENTS.md`](../../AGENTS.md). This file adds **www-app** conventions only.

## Identity

PakFactory **marketing site rebuild** — consultative packaging sales (quote / RFQ / contact), **not** e-commerce. PR base: **`www-new-release`**.

## Routes (Next.js App Router)

| Route group | Path prefix | Notes |
| ----------- | ----------- | ----- |
| `(site)` | `/`, `/products`, `/solutions`, `/capabilities`, `/expertise`, `/contact`, `/about`, `/policies`, `/bundles`, `/request` | Marketing pages; Sanity-backed catalog |
| `(auth)` | `/login`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify` | Buyer auth via Supabase |
| `(account)` | `/account`, `/account/profile`, `/account/requests` | Authenticated buyer area |
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
