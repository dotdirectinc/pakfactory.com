# Architecture Decision Records (ADRs)

This is the **decisions register** for the PakFactory monorepo — the single home for *why* an architectural choice was made. [`AGENTS.md`](../../AGENTS.md) is the front door for how to work in the repo and links here for decisions.

An ADR captures one decision: its context, the choice made, and the consequences. They are **append-only** — supersede an old ADR with a new one rather than rewriting history. Add a record by copying the format of an existing file, numbering it next in sequence, and adding a row below.

| ADR | Decision | Status | Link |
|-----|----------|--------|------|
| 003 | **Redirect strategy** — 404-triggered cached map + tag-revalidated webhook; auto-create on slug change via a Studio document action. | Accepted | [`0003-redirect-strategy.md`](0003-redirect-strategy.md) |
| 004 | **Media library** — `sanity-plugin-media` for a project-scoped library + asset-level alt/caption; blog GROQ coalesces per-use over asset-level. | Accepted | [`0004-media-library-strategy.md`](0004-media-library-strategy.md) |
| 005 | **Component organization** — feature/domain grouping (not schema); **`app/` routing-only**, all components in `src/components/<feature>` (+ `common/`) → `@pakfactory/ui`; `src/ = app/ components/ lib/`. | Grouping superseded by 008 (blog); routing-only/naming still Accepted | [`0005-component-organization.md`](0005-component-organization.md) |
| 006 | **Design system & tokens** — POC dieline system, Geist typography, and brand tokens centralized in `@pakfactory/ui/globals.css`; apps import, never define tokens. | Accepted | [`0006-design-system-and-tokens.md`](0006-design-system-and-tokens.md) |
| 007 | **Inline single-route page views** — a whole-page view rendered by exactly one route is written inline in that route's `page.tsx`; multi-route views stay components. Revises ADR-005 D6. | Accepted | [`0007-inline-single-route-page-views.md`](0007-inline-single-route-page-views.md) |
| 008 | **Component archetype grouping** — `apps/blog/src/components/` grouped by archetype/layer (`blocks/ layout/ views/ modules/ ui/`) for the Sanity page-builder; `blocks/` mirrors Studio `schemas/blocks/`; prefix-first file naming. Supersedes ADR-005's grouping axis (blog only). Terminology: ADR-012. | Accepted | [`0008-component-archetype-grouping.md`](0008-component-archetype-grouping.md) |
| 009 | **Blog pages content model** — `blogPage` with `pageRole` guard rails (singleton home, landing/static lists), section allowlists, `/{slug}` resolver order; posts stay structured skeletons; categories taxonomy-only. Replaces `blogHomePage`. | Accepted | [`0009-blog-pages-content-model.md`](0009-blog-pages-content-model.md) |
| 010 | **Blog document localization** — document-level EN/FR via `@sanity/document-internationalization` on blog types; Studio-first; GROQ `language` filters; public blog English-only until locale routes. | Accepted | [`0010-blog-document-localization.md`](0010-blog-document-localization.md) |
| 011 | **Component feature + layer hybrid** — ADR-008 layers stay primary; top-level feature folders for multi-layer single-page clusters (`post/`); feature subfolders inside one layer at 3+ files (`modules/widget/`); `blocks/` sacred. | Accepted | [`0011-component-feature-layer-hybrid.md`](0011-component-feature-layer-hybrid.md) |
| 012 | **Page-builder terminology** — "block", not "section", for page-builder code, Studio labels, and docs; supersedes ADR-008 terminology note; no dataset migration. | Accepted | [`0012-page-block-terminology.md`](0012-page-block-terminology.md) |

> Foundational platform decisions that predate this register (Turborepo monorepo, Sanity CMS, Next.js App Router, `@pakfactory/ui` shared primitives, pnpm) are summarized in [`AGENTS.md`](../../AGENTS.md) § "ADR summary".
