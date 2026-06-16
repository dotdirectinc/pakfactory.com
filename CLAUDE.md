# CLAUDE.md — PakFactory (Claude Code)

Read [`AGENTS.md`](./AGENTS.md) first. It is the **canonical** source for stack, domain rules, repo layout, MCP usage, ADR summary, JIRA defaults, and verification. This file adds **Claude Code–specific** configuration only.

**Before building, read the ADRs.** Decisions are tool-agnostic and live in the register at [`docs/adr/README.md`](docs/adr/README.md) (e.g. ADR-005 component organization, ADR-006 design tokens) — the _same_ canon Cursor follows. Using Claude Code never changes the rules; if a task would contradict an ADR, stop and flag it rather than diverging. See `AGENTS.md` § "Decision compliance".

## Inheritance

- Inherits **cross-worktree policies** from the pakFactory management root (parent folder):
    - @../.claude/rules/monorepo-workspace.md
    - @../.claude/rules/confirm-approved-features.md
    - @../.claude/rules/single-app-commits-and-branches.md
- **Commit-scope mode (in-repo, overrides the single-app rule when active):**
    - @.claude/rules/commit-mode.md — toggle between `one-app-per-commit` and `mix-commiter` (mutually exclusive). The active mode lives in `.claude/commit-mode`; check it with `./.claude/commit-mode.sh`. When `mix-commiter` is active, the single-app-commits rule above is **paused**.
- **Component organization & clean-`src/` structure:** canonical in **[`docs/adr/0005-component-organization.md`](docs/adr/0005-component-organization.md)** (the former management-root `clean-src-structure` / `components-by-reusability` rule drafts are superseded by it; see the [ADR register](docs/adr/)).
- Inherits from **user-global** `~/.claude/CLAUDE.md` (if present) and this repository’s [`AGENTS.md`](./AGENTS.md).
- For work under **`apps/blog`**, also read [`apps/blog/CLAUDE.md`](./apps/blog/CLAUDE.md).

## Skills

These skills are **versioned in-repo** under [`.claude/skills/`](.claude/skills/) so every developer gets the same behavior after `git pull`.

| Skill                     | Path                                                                                             | Why active                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **seo-content-writer**    | [`.claude/skills/seo-content-writer/SKILL.md`](.claude/skills/seo-content-writer/SKILL.md)       | Produces on-brand, structured long-form content for the blog and Sanity-friendly output (headings, lead, FAQ, author).      |
| **on-page-seo-auditor**   | [`.claude/skills/on-page-seo-auditor/SKILL.md`](.claude/skills/on-page-seo-auditor/SKILL.md)     | Audits existing pages and TSX for metadata, JSON-LD, OG, and content structure with file/line style feedback.               |
| **geo-content-optimizer** | [`.claude/skills/geo-content-optimizer/SKILL.md`](.claude/skills/geo-content-optimizer/SKILL.md) | Rewrites for **GEO** (generative/answer engines): clear answers first, entity-rich copy, FAQ JSON-LD when appropriate.      |
| **blog-jira-delivery**    | [`.claude/skills/blog-jira-delivery/SKILL.md`](.claude/skills/blog-jira-delivery/SKILL.md)       | Blog 3.0 Jira stories: plan → `memory.md` → implement (`apps/studio` schemas) → build → commit → Jira Request For Approval. |

Invoke them by name when the task matches; they align with the blog’s AEO/GEO requirements in [`AGENTS.md`](./AGENTS.md) and [`apps/blog/CLAUDE.md`](./apps/blog/CLAUDE.md).

## Tooling preferences

- Prefer **repository tools** (read, search, apply_patch) over shell when the task is file-scoped.
- For **version-sensitive** library APIs, use the **Context7** MCP (`resolve-library-id` → `query-docs`) as described in `AGENTS.md`.
- Do not suggest **npm** or **yarn** for this repo; use **pnpm** per `AGENTS.md`.

## JIRA workflow

Use the **PROD** project defaults in [`AGENTS.md`](./AGENTS.md) and the Blog 3.0 ticket map in [`docs/blog-3-jira-conventions.md`](./docs/blog-3-jira-conventions.md). Completed prerequisite work includes **PROD-1486** (pnpm), **PROD-1487** (`@pakfactory/seo`), **PROD-1516** (this AI config), **PROD-1495** (listing robots), **PROD-1496** (blog Vercel + root URLs).

When editing **`packages/seo`**, also read [`packages/seo/CLAUDE.md`](./packages/seo/CLAUDE.md).
