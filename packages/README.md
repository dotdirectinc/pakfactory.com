# Packages

Shared workspace libraries for the PakFactory monorepo. **Apps** (`apps/*`) are deployables; **packages** are extracted libraries. Binding rules: [`AGENTS.md`](../AGENTS.md) § Workspace packages and [ADR-019](../docs/adr/0019-workspace-package-taxonomy.md).

Layout is **flat** under `packages/*` (roles live in this doc / ADR — no role parent folders).

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
| [`domain`](domain) | Request / shipping / account types + adapters; country/region lists (`@pakfactory/domain/geo`) |

## Infra / web ops

| Package | Purpose |
| --- | --- |
| [`redirects`](redirects) | Shared redirect map helpers (blog + www) |
| [`sitemap`](sitemap) | Shared sitemap builders |

## Feature (multi-app product UI)

| Package | Purpose |
| --- | --- |
| [`auth-ui`](auth-ui) | Login / auth shell (www + admin) — long-lived feature package |
| [`brief-builder-ui`](brief-builder-ui) | Request-review UI (www + admin) — long-lived feature package |

Retired (do not recreate): `@pakfactory/components` → `ui`; `@pakfactory/geo` → `domain/geo`.

## Promotion cheat sheet

1. New code → owning **app**.
2. Second app needs it (or platform) → extract here.
3. UI primitives → **`ui` only** (never a second design system).
