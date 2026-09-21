# Packages

Shared workspace libraries for the PakFactory monorepo. **Apps** (`apps/*`) are deployables; **packages** are extracted libraries. Binding rules: [`AGENTS.md`](../AGENTS.md) § Workspace packages and [ADR-019](../docs/adr/0019-workspace-package-taxonomy.md).

Most packages are **flat** under `packages/*`. Feature `*-ui` packages live under [`features/`](features/).

## Platform

| Package | Purpose |
| --- | --- |
| [`ui`](ui) | Design-system primitives + tokens; pagination & watermark helpers (`lib/pagination`, `lib/watermark`) |
| [`sanity`](sanity) | CMS helpers, GROQ, shared contracts |
| [`utilities`](utilities) | General pure helpers (length units, dimension axes, external-link) |
| [`seo`](seo) | Typed JSON-LD / schema.org generators |
| [`supabase`](supabase) | Auth client, server, session |

## Domain

| Package | Purpose |
| --- | --- |
| [`request`](request) | RFQ / shipping / account types + adapters; country/region lists (`@pakfactory/request/geo`) |

## Infra / web ops

| Package | Purpose |
| --- | --- |
| [`redirects`](redirects) | Shared redirect map helpers (blog + www) |
| [`sitemap`](sitemap) | Shared sitemap builders |

## Feature (multi-app product UI)

| Package | Purpose |
| --- | --- |
| [`features/auth-ui`](features/auth-ui) | Login / auth shell (www + admin) — `@pakfactory/auth-ui` |
| [`features/brief-builder-ui`](features/brief-builder-ui) | Request-review UI (www + admin) — `@pakfactory/brief-builder-ui` |

Retired (do not recreate): `@pakfactory/components` → `ui`; `@pakfactory/geo` → `request/geo`; `@pakfactory/domain` → `@pakfactory/request`.

## Promotion cheat sheet

1. New code → owning **app**.
2. Second app needs it (or platform) → extract here.
3. UI primitives → **`ui` only** (never a second design system).
4. New multi-app product shells → `packages/features/<name>-ui`.
