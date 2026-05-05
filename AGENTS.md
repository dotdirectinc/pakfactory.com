# AGENTS.md — PakFactory monorepo (canonical for AI and humans)

This file is the **single source of truth** for product context, stack constraints, collaboration defaults, and MCP expectations. **Claude Code** and **Cursor** both inherit from it via root [`CLAUDE.md`](./CLAUDE.md) and [`.cursor/rules/`](.cursor/rules/). Do not contradict this document.

## Identity

- **PakFactory** is a custom packaging company. This monorepo powers the **marketing site** (`apps/www`), **blog** (`apps/blog`), and **Sanity Studio** (`apps/studio`). Structured content lives in **Sanity**; Next.js apps consume shared [`@pakfactory/sanity`](packages/sanity) and [`@pakfactory/ui`](packages/ui).

- **Platform Evolution**: The blog is the **first production stream** — patterns proven here (content ops, SEO/AEO/GEO, CI, previews) set the bar for future streams.

<!-- TODO content owner: expand Academy vision — curriculum goals, audience, relationship to blog and Studio -->

**Academy vision (draft):** PakFactory Academy will pair authoritative packaging education with the same structured-content stack as the marketing site, so lessons stay consistent with live products and capabilities. Replace this paragraph when the Academy narrative is finalized.

## Stack constraints (binding)

| Area | Choice |
|------|--------|
| **Package manager** | **pnpm 9.x** only (`package.json` `packageManager`). Do **not** use npm or yarn for installs or scripts at the repo root. |
| **Runtime** | Node **≥ 20.19** |
| **Monorepo** | Turborepo (`turbo.json`) |
| **Apps** | Next.js **16** (App Router), React **19**, Tailwind **4** |
| **CMS** | Sanity **5**, GROQ via `defineQuery`, schemas via `defineType` / `defineField` |
| **Language** | TypeScript **5** |

Install from repo root: `pnpm install`. Add a dependency to a workspace: `pnpm add <pkg> --filter @pakfactory/blog` (example).

## Domain rules — not a Shopify storefront

This codebase is **not** Shopify, WooCommerce, or a generic e‑commerce stack.

- **No** shopping carts, checkout flows, or PDP “add to cart” patterns unless explicitly requested by product for a future initiative.
- PakFactory sells **custom packaging** via **quote / RFQ / consultative** flows. Prefer CTAs like “Get a quote”, “Talk to packaging experts”, or links to contact — not cart UX.
- Do **not** assume product catalog schemas map to SKUs, inventory sync, or storefront APIs unless code explicitly implements them.

When Sanity rule files mention Shopify (e.g. legacy templates), treat those sections as **non-authoritative** for this repo unless the task is Shopify integration.

## Repo layout

| Path | Role |
|------|------|
| [`apps/www`](apps/www) | Main marketing site (port **3000**) |
| [`apps/blog`](apps/blog) | Blog app — Platform Evolution stream #1 (port **3001**) |
| [`apps/studio`](apps/studio) | Sanity Studio (port **3333**) |
| [`packages/sanity`](packages/sanity) | Shared schemas, GROQ queries, scripts |
| [`packages/ui`](packages/ui) | Shared shadcn-style UI primitives |
| [`packages/seo`](packages/seo) | Typed JSON-LD / schema.org generators (`@pakfactory/seo`) |

## UI and design system (preserve primitives)

These rules align with [`.cursor/rules/workspace-instructions.mdc`](.cursor/rules/workspace-instructions.mdc):

- **Do not edit** existing files under `packages/ui/src/components` except when fixing a **confirmed** bug you were asked to fix.
- **Do not change** `packages/ui/src/globals.css` or `apps/www/src/app/globals.css` for new features (no new design tokens, no drive-by `@theme` edits).
- **Allowed:** add **new** primitive files only when required (e.g. from shadcn CLI) — additive only.
- Prefer layout and one-off styling in **app or page code** using existing tokens and `className`.
- **Do not change** global shell layout (root `layout.tsx`, global navbar) unless the task explicitly asks for it.

For `apps/blog`, do not add new tokens in `apps/blog/src/app/globals.css` for features; use `@pakfactory/ui` tokens and local `className` only.

## Sanity and GROQ

- Use **`defineQuery`** for all GROQ strings; colocate reusable queries in `packages/sanity` and import from `@pakfactory/sanity/queries` in apps.
- Schemas: **`defineType`**, **`defineField`**, **`defineArrayMember`**; no hardcoded API tokens — use `process.env` / Studio config.
- After schema changes: extract/deploy as your workflow requires before relying on MCP content tools. See [`.cursor/rules/agent-toolkit.mdc`](.cursor/rules/agent-toolkit.mdc) for the Knowledge Router and MCP content operations.
- For editor-specific GROQ and Studio patterns, use the same file and [Sanity AI best practices](https://www.sanity.io/docs/developer-guides/ai-best-practices).

## MCP defaults (when available)

Use MCP for authoritative, version-aware answers instead of guessing.

1. **Context7** (`user-context7` when configured): **`resolve-library-id`** then **`query-docs`** before stating **library-specific** APIs or deprecations for Next.js, React, Sanity client, Tailwind, etc.
2. **Sanity** (`https://mcp.sanity.io` or configured alias): content queries, schema deploy, docs search — follow [`.cursor/rules/agent-toolkit.mdc`](.cursor/rules/agent-toolkit.mdc).
3. **shadcn** / **shadcn-studio**: registered in [`.cursor/mcp.json`](.cursor/mcp.json) under `shadcn` and `shadcn-studio` — use for CLI/registry workflows per server instructions; do not bypass mandated workflows.
4. **Figma** (`figma` in `.cursor/mcp.json`): design URLs with `fileKey` + `nodeId` for inspection and design-to-code workflows.

Do not put secrets or proprietary source into MCP prompts.

## Blog stream context (AEO / GEO)

The blog prioritizes **AEO** (Answer Engine Optimization) and **GEO** (Generative Engine Optimization):

- **Structured data**: Post pages should expose accurate JSON-LD (**`BlogPosting`** / related types) via **`@pakfactory/seo`** — do not duplicate schema builders in app routes. Complete **Open Graph** / Twitter metadata (see [`apps/blog/CLAUDE.md`](apps/blog/CLAUDE.md)).
- **Content**: Clear headings, factual lead paragraphs, entity-rich copy where appropriate; optional **FAQ** JSON-LD when the page answers concrete questions.

Details and naming conventions: [`apps/blog/CLAUDE.md`](apps/blog/CLAUDE.md).

## ADR summary (draft — confirm links)

<!-- TODO content owner: replace placeholder links with real ADR doc URLs or in-repo paths -->

| ADR | Decision | Link |
|-----|----------|------|
| **Monorepo orchestration** | Use **Turborepo** for tasks, caching, and env passthrough across apps and packages. | *TBD* |
| **CMS** | **Sanity** as structured content layer with shared package `@pakfactory/sanity`. | *TBD* |
| **Web framework** | **Next.js App Router** for www + blog; server components by default. | *TBD* |
| **Shared UI** | **`@pakfactory/ui`** workspace package for primitives; apps own composition and marketing blocks. | *TBD* |
| **Package manager** | **pnpm** with `workspace:*` protocol for internal packages; reproducible installs via `pnpm-lock.yaml`. | *TBD* |

## JIRA defaults (draft)

<!-- confirm with PM — values below are conventions only until ratified -->

| Item | Convention |
|------|------------|
| **Project key** | `PAK` |
| **Issue prefix** | `PAK-123` |
| **Branches** | `feat/PAK-123-short-slug`, `fix/PAK-123-short-slug` |
| **Commits** | Include reference: `Refs: PAK-123` or `PAK-123: summary` per team habit |
| **PR titles** | `[PAK-123] Short description` |

## AI verification checklist

After onboarding, open the monorepo in your IDE and run the prompts in [README.md](./README.md) **AI IDE setup** → **Verification prompts**. The assistant should refuse carts/Shopify assumptions, insist on **pnpm**, protect **packages/ui**, and follow blog Sanity + schema rules.
