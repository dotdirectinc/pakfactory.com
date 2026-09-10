# Architecture Decision Records (ADRs)

This is the **decisions register** for the PakFactory monorepo — the single home for *why* an architectural choice was made. [`AGENTS.md`](../../AGENTS.md) is the front door for how to work in the repo and links here for decisions.

**Practice front doors (not ADR merges):** React/Next scaffold → [`ENGINEERING.md`](../../ENGINEERING.md) · UI look → [`DESIGN.md`](../../DESIGN.md).

An ADR captures one decision: its context, the choice made, and the consequences. They are **append-only** — supersede an old ADR with a new one rather than rewriting history. Add a record by copying the format of an existing file, numbering it next in sequence, and adding a row below.

## Applies to (surface tags)

| Tag | Meaning |
| --- | --- |
| `all` | Shared across apps / packages |
| `blog` | `apps/blog` (and blog-facing Studio schemas) |
| `www` | Marketing site rebuild / catalog (`apps/www`) |
| `studio` | Sanity Studio schemas, desk, Studio `lib/` |
| `admin` | `apps/admin` — reserved; **no ADRs yet** (do not invent empty sections) |

Primary index axis is **decision domain** (below). Surfaces are a **second column**, not a merge key. Do not glue Accepted ADR files into domain mega-docs.

## Current rules by domain (start here)

| Domain | Applies to | Read first | ADR trail |
| --- | --- | --- | --- |
| **Scaffold / composition** | `blog` layers; `all` for ADR-013; www folder migration deferred | [`ENGINEERING.md`](../../ENGINEERING.md) | 005 → 008 → 011 → 013; 007 |
| **Design system / tokens** | `all` | [`DESIGN.md`](../../DESIGN.md) + [`packages/ui/src/globals.css`](../../packages/ui/src/globals.css) | 006 |
| **Page-composition terminology** | `blog` until 015; `all` after ratification | **012** until **015** ratified | 012 Accepted; **015 Proposed** |
| **Blog content / i18n** | `blog` | [`apps/blog/CLAUDE.md`](../../apps/blog/CLAUDE.md) | 009, 010 |
| **CMS / Studio contracts** | `studio` + consumers (`blog`, `www`) | [`apps/studio/CLAUDE.md`](../../apps/studio/CLAUDE.md) | 004, 014, 016 |
| **Redirects** | `blog` | — | 003 |
| **Product customization model** | `www` | — | 017 |
| **Foundational (pre-register)** | `all` | [`AGENTS.md`](../../AGENTS.md) § ADR summary | Turborepo, Sanity, Next, `@pakfactory/ui`, pnpm — no fake 001/002 files |

> **Terminology callout:** Until [ADR-015](0015-page-composition-sections-terminology.md) is **Accepted**, blog page-builder code and docs use **“block”** ([ADR-012](0012-page-block-terminology.md)). Do not rename `pageBuilder` → `sections` in the dataset without the gated follow-up ticket.

## Full register

| ADR | Decision | Status | Applies to | Link |
|-----|----------|--------|------------|------|
| 003 | **Redirect strategy** — 404-triggered cached map + tag-revalidated webhook; auto-create on slug change via a Studio document action. | Accepted | `blog` | [`0003-redirect-strategy.md`](0003-redirect-strategy.md) |
| 004 | **Media library** — `sanity-plugin-media` for a project-scoped library + asset-level alt/caption; blog GROQ coalesces per-use over asset-level. | Accepted | `studio`, `blog` | [`0004-media-library-strategy.md`](0004-media-library-strategy.md) |
| 005 | **Component organization** — feature/domain grouping (not schema); **`app/` routing-only**, naming, `@pakfactory/ui` tier. | Grouping superseded by 008 (blog); routing-only/naming still Accepted | `blog` (www deferred) | [`0005-component-organization.md`](0005-component-organization.md) |
| 006 | **Design system & tokens** — POC dieline system, Geist typography, brand tokens, and 8pt spacing (`--spacing-grid-unit`) centralized in `@pakfactory/ui/globals.css`; apps import, never define tokens. | Accepted | `all` | [`0006-design-system-and-tokens.md`](0006-design-system-and-tokens.md) |
| 007 | **Inline single-route page views** — a whole-page view rendered by exactly one route is written inline in that route's `page.tsx`; multi-route views stay components. Revises ADR-005 D6. | Accepted | `blog` (portable) | [`0007-inline-single-route-page-views.md`](0007-inline-single-route-page-views.md) |
| 008 | **Component archetype grouping** — `apps/blog/src/components/` grouped by archetype/layer (`blocks/ layout/ views/ modules/ ui/`) for the Sanity page-builder; `blocks/` mirrors Studio `schemas/blocks/`; prefix-first file naming. Supersedes ADR-005's grouping axis (blog only). Terminology: ADR-012. | Accepted | `blog` | [`0008-component-archetype-grouping.md`](0008-component-archetype-grouping.md) |
| 009 | **Blog pages content model** — `blogPage` with `pageRole` guard rails (singleton home, landing/static lists), section allowlists, `/{slug}` resolver order; posts stay structured skeletons; categories taxonomy-only. Replaces `blogHomePage`. | Accepted | `blog` | [`0009-blog-pages-content-model.md`](0009-blog-pages-content-model.md) |
| 010 | **Blog document localization** — document-level EN/FR via `@sanity/document-internationalization` on blog types; Studio-first; GROQ `language` filters; public blog English-only until locale routes. | Accepted | `blog` | [`0010-blog-document-localization.md`](0010-blog-document-localization.md) |
| 011 | **Component feature + layer hybrid** — ADR-008 layers stay primary; top-level feature folders for multi-layer single-page clusters (`post/`); feature subfolders inside one layer at 3+ files (`modules/widget/`); `blocks/` sacred. | Accepted | `blog` | [`0011-component-feature-layer-hybrid.md`](0011-component-feature-layer-hybrid.md) |
| 012 | **Page-builder terminology** — "block", not "section", for page-builder code, Studio labels, and docs; supersedes ADR-008 terminology note; no dataset migration. | Accepted; **binding for blog until 015 ratified** | `blog` | [`0012-page-block-terminology.md`](0012-page-block-terminology.md) |
| 013 | **Shared core vs feature composition** — extract shared UI as controlled, props-only `ui/` primitives; features own data/URL wiring in `modules/` controllers; never import one feature's component into another or fork it. Extends ADR-005/008/011. | Accepted | `all` | [`0013-shared-core-vs-feature-composition.md`](0013-shared-core-vs-feature-composition.md) |
| 014 | **Sanity naming** — `_type` names + schema titles + Studio desk labels all singular (camelCase types); `_type` renames are content migrations, never casual renames. Blog desk labels singularized (PROD-1965); www taxonomy labels = follow-up. | Accepted | `studio` (+ consumers) | [`0014-sanity-studio-naming.md`](0014-sanity-studio-naming.md) |
| 015 | **Page-composition terminology** — "Sections" (not "block") platform-wide for the §2.4 tab set + shared sections framework (Foundations PROD-2286); supersedes ADR-012 terminology. Blog `pageBuilder`→`sections` field rename deferred to PROD-2293, gated on ratification. | **Proposed** (pending Eric) | → `all` when Accepted | [`0015-page-composition-sections-terminology.md`](0015-page-composition-sections-terminology.md) |
| 016 | **`@sanity/presets` evaluation** — evaluated 1.0.6, not adopted as the base; hand-rolled `lib/` sets encode PakFactory contracts (settings-singleton SEO fallbacks, href resolver, media tags) a generic preset would strip at a migration cost §2.4 forbids. Revisit for greenfield leaf fields / stable release. | Accepted | `studio` | [`0016-sanity-presets-evaluation.md`](0016-sanity-presets-evaluation.md) |
| 017 | **Customization availability & `role`** — `appliesTo` splits into four axis-scoped fields (`availableOnProducts`/`exceptProducts` · `worksOnCustomizations`/`incompatibleWithCustomizations`); `role` (`configurable`\|`reference`) on the Option, not the Type; a configurable Option has no URL. Content-model D47; supersedes D42–D44 availability and D46's "no flag". | Accepted | `www` | [`0017-customization-availability-axes-and-role.md`](0017-customization-availability-axes-and-role.md) |

> Foundational platform decisions that predate this register (Turborepo monorepo, Sanity CMS, Next.js App Router, `@pakfactory/ui` shared primitives, pnpm) are summarized in [`AGENTS.md`](../../AGENTS.md) § "ADR summary".
