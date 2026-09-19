# Packages

Shared workspace libraries for the PakFactory monorepo. **Apps** (`apps/*`) are deployables; **packages** are extracted libraries. Binding rules: [`AGENTS.md`](../AGENTS.md) § Workspace packages and [ADR-019](../docs/adr/0019-workspace-package-taxonomy.md).

## Platform

| Package | Purpose |
| --- | --- |
| [`ui`](ui) | Design-system primitives + tokens (`@pakfactory/ui`) |
| [`sanity`](sanity) | CMS helpers, GROQ, shared contracts |
| [`utilities`](utilities) | Pure helpers (length units, dimension axes, …) |
| [`seo`](seo) | Typed JSON-LD / schema.org generators |
| [`supabase`](supabase) | Auth client, server, session |

## Domain

| Package | Purpose |
| --- | --- |
| [`domain`](domain) | Request / shipping / account types + adapters |
| [`geo`](geo) | Country lists — fold into domain or utilities later |

## Infra / web ops

| Package | Purpose |
| --- | --- |
| [`redirects`](redirects) | Shared redirect map helpers (blog + www) |
| [`sitemap`](sitemap) | Shared sitemap builders |

## Feature (multi-app product UI)

| Package | Purpose |
| --- | --- |
| [`auth-ui`](auth-ui) | Login / auth shell (www + admin) |
| [`brief-builder-ui`](brief-builder-ui) | Request-review UI (www + admin) |
| [`components`](components) | **Extract-pending** — www+blog listing helpers, watermark, legacy chrome. Do **not** add new files; migrate toward `@pakfactory/ui` / `@pakfactory/utilities` (ADR-019 phases 1–4), then retire. |

## Promotion cheat sheet

1. New code → owning **app**.
2. Second app needs it (or platform) → extract here.
3. UI primitives → **`ui` only** (never a second design system).
