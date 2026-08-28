# CLAUDE.md — `@pakfactory/studio`

Inherits root [`CLAUDE.md`](../../CLAUDE.md) and [`AGENTS.md`](../../AGENTS.md). This file adds **Sanity Studio** conventions only.

## Identity

**Sanity Studio** for all structured content: blog, www marketing pages, case studies, products, solutions, expertise, global settings. Port **3333**.

## Schema layout

| Path | Role |
| ---- | ---- |
| `schemas/` | Document types (`defineType`, `defineField`, `defineArrayMember`) |
| `schemas/blocks/` | Page-builder block types (terminology: "block", per ADR-012) |
| `schemas/inline/` | Inline portable-text block types |
| `structure/` | Desk structure per workspace |
| `actions/` | Document actions (e.g. publish with redirect) |
| `presentation/` | Live preview location resolvers |
| `lib/` | Shared helpers (`seo-fields.ts`, field groups, channels) |
| `components/` | Custom Studio views (not Next.js components) |

## SEO and Social fields (binding)

Every content type that needs SEO/Social must use [`lib/seo-fields.ts`](./lib/seo-fields.ts):

- `seoFields(...)` + `socialFields(...)` — do **not** hand-redeclare `metaTitle` / `ogImage` per schema
- Robots toggles: **`allowIndex` / `allowFollow` / `noImageIndex`** (not inverted `noindex`)
- `canonical` only where `canonical: true` is passed
- Fallbacks resolve in **GROQ / front-end**, not in schema defaults

## Naming (ADR-014)

- Document type `name`s (`_type`), schema `title`s, and desk labels are **singular** (`post` / "Post")
- Never rename an existing `_type` without a content migration ticket

## Agent guardrails (binding)

**Agents may:**

- Edit schemas, desk structure, document actions, and GROQ in git
- Read Sanity via GROQ or MCP query tools

**Agents must never:**

- Run seed scripts (`seed.mjs`, `seed-blog-dev.mjs`, etc.)
- Create, patch, publish, or delete documents on any dataset
- Use Sanity MCP to write editorial content

Humans run seeds and Studio editorial updates. See root [`AGENTS.md`](../../AGENTS.md) § Sanity content — agent guardrails.

## Seeds and migrations

- Seed/migrate scripts live in `scripts/` and `packages/sanity/scripts/`
- Dataset switching: [`scripts/sanity/RUNBOOK.md`](../../scripts/sanity/RUNBOOK.md)
- Ops detail: [`memory.md`](./memory.md)

## Presentation preview

Env in `apps/studio/.env.local` (Vite does not load root `.env.local`):

- `SANITY_STUDIO_PREVIEW_URL_WWW` — www dev (**http://localhost:3003/case-studies/**)
- `SANITY_STUDIO_PREVIEW_URL_BLOG` — blog dev (**http://localhost:3004/**)

Keep `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` aligned with repo root.

## Local dev

```bash
pnpm dev:studio    # http://localhost:3333
```

Copy [`apps/studio/.env.example`](./.env.example) → `apps/studio/.env.local`.

## Deploy

```bash
pnpm --filter @pakfactory/studio run deploy
```

Requires Sanity CLI auth.
