# Architecture Decision Records (ADRs)

This is the **decisions register** for the PakFactory monorepo — the single home for *why* an architectural choice was made. [`AGENTS.md`](../../AGENTS.md) is the front door for how to work in the repo and links here for decisions.

An ADR captures one decision: its context, the choice made, and the consequences. They are **append-only** — supersede an old ADR with a new one rather than rewriting history. Add a record by copying the format of an existing file, numbering it next in sequence, and adding a row below.

| ADR | Decision | Status | Link |
|-----|----------|--------|------|
| 003 | **Redirect strategy** — 404-triggered cached map + tag-revalidated webhook; auto-create on slug change via a Studio document action. | Accepted | [`0003-redirect-strategy.md`](0003-redirect-strategy.md) |
| 004 | **Media library** — `sanity-plugin-media` for a project-scoped library + asset-level alt/caption; blog GROQ coalesces per-use over asset-level. | Accepted | [`0004-media-library-strategy.md`](0004-media-library-strategy.md) |
| 005 | **Component organization** — feature/domain grouping (not schema); **`app/` routing-only**, all components in `src/components/<feature>` (+ `common/`) → `@pakfactory/ui`; `src/ = app/ components/ lib/`. | Accepted | [`0005-component-organization.md`](0005-component-organization.md) |
| 006 | **Design system & tokens** — POC dieline system, Geist typography, and brand tokens centralized in `@pakfactory/ui/globals.css`; apps import, never define tokens. | Accepted | [`0006-design-system-and-tokens.md`](0006-design-system-and-tokens.md) |

> Foundational platform decisions that predate this register (Turborepo monorepo, Sanity CMS, Next.js App Router, `@pakfactory/ui` shared primitives, pnpm) are summarized in [`AGENTS.md`](../../AGENTS.md) § "ADR summary".
