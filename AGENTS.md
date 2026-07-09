# AGENTS.md — PakFactory monorepo (canonical for AI and humans)

This file is the **single source of truth** for product context, stack constraints, collaboration defaults, and MCP expectations. **Claude Code** and **Cursor** both inherit from it via root [`CLAUDE.md`](./CLAUDE.md) and [`.cursor/rules/`](.cursor/rules/). Do not contradict this document.

## Decision compliance — every tool, same canon

The development tool does not change the rules. Whether you build through **Claude Code, Cursor, or any other assistant**, you work from the **same canon**: this `AGENTS.md` plus the **ADR register at [`docs/adr/`](docs/adr/)** (start at [`docs/adr/README.md`](docs/adr/README.md)).

- **Before implementing any feature or change, read the relevant ADRs.** They are binding and tool-agnostic — they define _how we organize code, name things, place components, and handle the design system_ (e.g. ADR-005 component organization, ADR-006 design tokens).
- **If a task would contradict an ADR, stop and flag it.** Change a decision by writing a new ADR that supersedes the old one — never by diverging in code or in a tool-specific file.
- **Tool files (`CLAUDE.md`, `.cursor/rules/*`, `.cursor/TECH_LEAD.md`) describe only _how to drive that tool_.** They must point here for decisions and never restate or fork them. Two developers on two tools should produce code that looks like it came from one team.

## Identity

- **PakFactory** is a custom packaging company. This monorepo powers the **marketing site** (`apps/www`), **blog** (`apps/blog`), and **Sanity Studio** (`apps/studio`). Structured content lives in **Sanity**; Next.js apps consume shared [`@pakfactory/sanity`](packages/sanity) and [`@pakfactory/ui`](packages/ui).

- **Platform Evolution**: The blog is the **first production stream** — patterns proven here (content ops, SEO/AEO/GEO, CI, previews) set the bar for future streams.

<!-- TODO content owner: expand Academy vision — curriculum goals, audience, relationship to blog and Studio -->

**Academy vision (draft):** PakFactory Academy will pair authoritative packaging education with the same structured-content stack as the marketing site, so lessons stay consistent with live products and capabilities. Replace this paragraph when the Academy narrative is finalized.

## Stack constraints (binding)

| Area                | Choice                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Package manager** | **pnpm 9.x** only (`package.json` `packageManager`). Do **not** use npm or yarn for installs or scripts at the repo root. |
| **Runtime**         | Node **≥ 20.19**                                                                                                          |
| **Monorepo**        | Turborepo (`turbo.json`)                                                                                                  |
| **Apps**            | Next.js **16** (App Router), React **19**, Tailwind **4**                                                                 |
| **CMS**             | Sanity **5**, GROQ via `defineQuery`, schemas via `defineType` / `defineField`                                            |
| **Language**        | TypeScript **5**                                                                                                          |

Install from repo root: `pnpm install`. Add a dependency to a workspace: `pnpm add <pkg> --filter @pakfactory/blog` (example).

## Domain rules — not a Shopify storefront

This codebase is **not** Shopify, WooCommerce, or a generic e‑commerce stack.

- **No** shopping carts, checkout flows, or PDP “add to cart” patterns unless explicitly requested by product for a future initiative.
- PakFactory sells **custom packaging** via **quote / RFQ / consultative** flows. Prefer CTAs like “Get a quote”, “Talk to packaging experts”, or links to contact — not cart UX.
- Do **not** assume product catalog schemas map to SKUs, inventory sync, or storefront APIs unless code explicitly implements them.

When Sanity rule files mention Shopify (e.g. legacy templates), treat those sections as **non-authoritative** for this repo unless the task is Shopify integration.

## Repo layout

| Path                                 | Role                                                      |
| ------------------------------------ | --------------------------------------------------------- |
| [`apps/www`](apps/www)               | Main marketing site (port **3000**)                       |
| [`apps/blog`](apps/blog)             | Blog app — Platform Evolution stream #1 (port **3001**)   |
| [`apps/studio`](apps/studio)         | Sanity Studio (port **3333**)                             |
| [`packages/sanity`](packages/sanity) | Shared schemas, GROQ queries, scripts                     |
| [`packages/ui`](packages/ui)         | Shared shadcn-style UI primitives                         |
| [`packages/seo`](packages/seo)       | Typed JSON-LD / schema.org generators (`@pakfactory/seo`) |

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

### Sanity content — agent guardrails (binding)

Editorial documents (posts, pages, singletons, navigation, etc.) live in the **Sanity dataset**, not in git. AI agents (**Cursor, Claude Code, and any in-repo skill**) must treat content writes as **human-only**.

**Agents may:**

- Add or change **schema** in [`apps/studio/schemas/`](apps/studio/schemas/) (fields, section types, validation, groups, previews)
- Wire desk structure, document actions, GROQ in [`packages/sanity/`](packages/sanity/), and front-end rendering
- **Read** Sanity via GROQ, client fetch, or MCP **query** tools for debugging

**Naming (binding — ADR-014):** document type `name`s (`_type`), schema `title`s, and Studio desk labels are all **singular** (`post` / "Post"; camelCase type names; arrays keep natural plural field names like `tags`). Never rename an existing `_type` — that is a content migration, not a rename; plan it as its own ticket. See [`docs/adr/0014-sanity-studio-naming.md`](docs/adr/0014-sanity-studio-naming.md).

**`blogPage` pinned singletons** (`blogHomePage`, `blogTopicsPage`, `blogNotFoundPage`, `blogSearchPage`): `pageRole` is implied by document id; seeds must set explicit `pageRole`. Ops and troubleshooting: [`apps/blog/memory.md`](apps/blog/memory.md) § blogPage singleton — pageRole contract.

**Agents must never:**

- Run seed scripts (`seed.mjs`, `seed-blog-dev.mjs`, `seed-blog-singleton-pages.mjs`, etc.)
- Use Sanity MCP or `@sanity/client` to **create, patch, replace, delete, or publish** documents
- Mutate editorial content on **any** dataset (`development` or `production`)

**Humans** own document writes: Studio UI, explicit seed runs, approved migrations, and dataset export/import.

When a feature needs example data, document **what humans should seed** in [`apps/blog/memory.md`](apps/blog/memory.md) or the PR — do not execute seeds or patch documents. Refuse requests such as “run `pnpm seed:blog-dev`”, “patch `blogHomePage` via MCP”, or “publish this post” unless the user will run the write themselves; agents may only implement schema/code and state the human command.

Human workflow (no agent writes): [`apps/blog/memory.md`](apps/blog/memory.md) § Content vs seed workflow.

## MCP defaults (when available)

Use MCP for authoritative, version-aware answers instead of guessing.

1. **Context7** (`user-context7` when configured): **`resolve-library-id`** then **`query-docs`** before stating **library-specific** APIs or deprecations for Next.js, React, Sanity client, Tailwind, etc.
2. **Sanity** (`https://mcp.sanity.io` or configured alias): **read** (query, inspect) and schema deploy — follow [`.cursor/rules/agent-toolkit.mdc`](.cursor/rules/agent-toolkit.mdc). **Do not** use MCP to create, patch, publish, or delete documents (see § Sanity content — agent guardrails).
3. **shadcn** / **shadcn-studio**: registered in [`.cursor/mcp.json`](.cursor/mcp.json) under `shadcn` and `shadcn-studio` — use for CLI/registry workflows per server instructions; do not bypass mandated workflows.
4. **Figma** (`figma` in `.cursor/mcp.json`): design URLs with `fileKey` + `nodeId` for inspection and design-to-code workflows.

Do not put secrets or proprietary source into MCP prompts.

## Blog stream context (AEO / GEO)

The blog prioritizes **AEO** (Answer Engine Optimization) and **GEO** (Generative Engine Optimization):

- **Structured data**: Post pages should expose accurate JSON-LD (**`BlogPosting`** / related types) via **`@pakfactory/seo`** — do not duplicate schema builders in app routes. Complete **Open Graph** / Twitter metadata (see [`apps/blog/CLAUDE.md`](apps/blog/CLAUDE.md)).
- **Content**: Clear headings, factual lead paragraphs, entity-rich copy where appropriate; optional **FAQ** JSON-LD when the page answers concrete questions.

Details and naming conventions: [`apps/blog/CLAUDE.md`](apps/blog/CLAUDE.md).

## Blog 3.0 — implemented dev conventions (Jira)

Shipped prerequisites are documented in **[`docs/blog-3-jira-conventions.md`](docs/blog-3-jira-conventions.md)** (ticket → file mapping). AI and humans must follow these when touching the blog or shared packages:

| Area                                                                                | Rule                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Package manager** ([PROD-1486](https://dotdirect.atlassian.net/browse/PROD-1486)) | **pnpm 9** only; `workspace:*` for `@pakfactory/*`; ADR-002                                                                                               |
| **JSON-LD** ([PROD-1487](https://dotdirect.atlassian.net/browse/PROD-1487))         | Use **`@pakfactory/seo`** only — see [`packages/seo/CLAUDE.md`](packages/seo/CLAUDE.md)                                                                   |
| **AI IDE config** ([PROD-1516](https://dotdirect.atlassian.net/browse/PROD-1516))   | This file + [`CLAUDE.md`](CLAUDE.md) + [`.cursor/rules/`](.cursor/rules/) + [`.claude/skills/`](.claude/skills/)                                          |
| **Listing robots** ([PROD-1495](https://dotdirect.atlassian.net/browse/PROD-1495))  | `getBlogRobotsDirective` in `apps/blog/src/lib/seo.ts` — paginated/filtered listings **noindex, follow**; posts **index, follow**                         |
| **Deploy & URLs** ([PROD-1496](https://dotdirect.atlassian.net/browse/PROD-1496))   | Blog app at deployment **root** (no URL `/blog` prefix); `NEXT_PUBLIC_SITE_URL` = blog origin; Vercel ops in [`apps/blog/memory.md`](apps/blog/memory.md) |

Epic: [PROD-1480 — Blog 3.0 Tech Prerequisites](https://dotdirect.atlassian.net/browse/PROD-1480).

## ADR summary

The full decisions register lives in **[`docs/adr/README.md`](docs/adr/)** — read it for any "why was this chosen?" question. Foundational platform decisions that predate the register are summarized below; numbered ADRs link out.

| ADR                                  | Decision                                                                                                                                                                                                                                         | Link                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **Monorepo orchestration**           | Use **Turborepo** for tasks, caching, and env passthrough across apps and packages.                                                                                                                                                              | _foundational_                                                                           |
| **CMS**                              | **Sanity** as structured content layer with shared package `@pakfactory/sanity`.                                                                                                                                                                 | _foundational_                                                                           |
| **Web framework**                    | **Next.js App Router** for www + blog; server components by default.                                                                                                                                                                             | _foundational_                                                                           |
| **Shared UI**                        | **`@pakfactory/ui`** workspace package for primitives; apps own composition and marketing blocks.                                                                                                                                                | _foundational_                                                                           |
| **Package manager**                  | **pnpm** with `workspace:*` protocol for internal packages; reproducible installs via `pnpm-lock.yaml`.                                                                                                                                          | _foundational_                                                                           |
| **ADR-003 — Redirect strategy**      | 404-triggered cached map + tag-revalidated webhook; auto-create on slug change via a Studio document action. Build-time `redirects()` rejected (needs redeploy); Edge Config + middleware deferred (no hot-path cost vs. always-on middleware).  | [`docs/adr/0003-redirect-strategy.md`](docs/adr/0003-redirect-strategy.md)               |
| **ADR-004 — Media library**          | **`sanity-plugin-media`** for project-scoped library + asset-level alt/caption written onto `sanity.imageAsset`; blog GROQ coalesces per-use over asset-level. Native Media Library (Enterprise / cross-project) is the documented upgrade path. | [`docs/adr/0004-media-library-strategy.md`](docs/adr/0004-media-library-strategy.md)     |
| **ADR-005 — Component organization** | Feature/domain grouping (not Sanity schema); **`app/` is routing-only**, all components in `src/components/<feature>` (+ `common/`) → `@pakfactory/ui`; `src/ = app/ components/ lib/`. Enforced in `apps/blog`; `www` deferred.                 | [`docs/adr/0005-component-organization.md`](docs/adr/0005-component-organization.md)     |
| **ADR-006 — Design system & tokens** | POC dieline system, Geist typography, and brand tokens centralized in `@pakfactory/ui/globals.css`; apps import, never define tokens.                                                                                                            | [`docs/adr/0006-design-system-and-tokens.md`](docs/adr/0006-design-system-and-tokens.md) |
| **ADR-013 — Shared core vs feature composition** | Extract shared UI as controlled, props-only `ui/` primitives; features own data/URL wiring in `modules/` controllers. Never import one feature's component into another, and never fork a feature component — extract the shared core. | [`docs/adr/0013-shared-core-vs-feature-composition.md`](docs/adr/0013-shared-core-vs-feature-composition.md) |

> ADRs 007–012 (component grouping refinements, blog content model, localization, page-builder terminology) and **ADR-014 (Sanity naming — singular types/titles/desk labels; `_type` renames are content migrations)** are listed in the register linked above.

## JIRA defaults (Product / Blog 3.0)

| Item              | Convention                                                                         |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Project key**   | `PROD`                                                                             |
| **Issue prefix**  | `PROD-123`                                                                         |
| **Branches**      | `feat/PROD-123-short-slug` or `feature/PROD-123-short-slug`, `fix/PROD-123-short-slug`, `chore/PROD-123-short-slug` (Jira key recommended) |
| **Commits**       | `PROD-123: summary` or trailer `Refs: PROD-123`                                    |
| **PR titles**     | `[PROD-123] Short description`                                                     |
| **Blog 3.0 epic** | [PROD-1480](https://dotdirect.atlassian.net/browse/PROD-1480) — tech prerequisites |

Full ticket-to-code mapping: [`docs/blog-3-jira-conventions.md`](docs/blog-3-jira-conventions.md).

## AI verification checklist

After onboarding, open the monorepo in your IDE and run the prompts in [README.md](./README.md) **AI IDE setup** → **Verification prompts**. The assistant should refuse carts/Shopify assumptions, insist on **pnpm**, protect **packages/ui**, follow blog Sanity + schema rules, and **refuse autonomous Sanity document writes** (seeds, MCP patch/publish) on any dataset.
