# CLAUDE.md — PakFactory (Claude Code)

Read [`AGENTS.md`](./AGENTS.md) first. It is the **canonical** source for stack, domain rules, repo layout, MCP usage, ADR summary, JIRA defaults, and verification. This file adds **Claude Code–specific** configuration only.

**Before building, read the ADRs.** Decisions are tool-agnostic and live in the register at [`docs/adr/README.md`](docs/adr/README.md) (e.g. ADR-005 component organization, ADR-006 design tokens, ADR-014 Sanity naming) — the _same_ canon Cursor follows. See `AGENTS.md` § "Decision compliance".

**Before designing, building, or planning UI components, read [`DESIGN.md`](./DESIGN.md).** Token values: [`packages/ui/src/globals.css`](packages/ui/src/globals.css). Doc map: [`docs/ai-agent-docs.md`](docs/ai-agent-docs.md).

## Inheritance

- **Commit-scope mode (in-repo):**
    - @.claude/rules/commit-mode.md — toggle between `one-app-per-commit` and `mix-commiter`. Active mode: `.claude/commit-mode` / `./.claude/commit-mode.sh`.
- **Dataset scripts:** @.claude/rules/dataset-script-placement-and-flags.md
- **Component organization:** [`docs/adr/0005-component-organization.md`](docs/adr/0005-component-organization.md) (and ADR-008/011/013).
- Optional **parent management-root** rules (`../.claude/rules/*`) may exist outside this clone — if those paths are missing, ignore them; in-repo rules above still apply.
- Inherits from **user-global** `~/.claude/CLAUDE.md` (if present) and this repository’s [`AGENTS.md`](./AGENTS.md).
- For work under **`apps/www`**, also read [`apps/www/CLAUDE.md`](./apps/www/CLAUDE.md).
- For work under **`apps/blog`**, also read [`apps/blog/CLAUDE.md`](./apps/blog/CLAUDE.md).
- For work under **`apps/studio`**, also read [`apps/studio/CLAUDE.md`](./apps/studio/CLAUDE.md).
- For work under **`apps/admin`**, also read [`apps/admin/AGENTS.md`](./apps/admin/AGENTS.md).

## Skills

Skills are **versioned in-repo** under [`.claude/skills/`](.claude/skills/):

| Skill | Path | Why active |
| --- | --- | --- |
| **seo-content-writer** | [`.claude/skills/seo-content-writer/SKILL.md`](.claude/skills/seo-content-writer/SKILL.md) | On-brand blog long-form / Sanity-friendly structure |
| **on-page-seo-auditor** | [`.claude/skills/on-page-seo-auditor/SKILL.md`](.claude/skills/on-page-seo-auditor/SKILL.md) | Metadata / JSON-LD / OG audits |
| **geo-content-optimizer** | [`.claude/skills/geo-content-optimizer/SKILL.md`](.claude/skills/geo-content-optimizer/SKILL.md) | GEO rewrites |
| **seo-structured-data** | [`.claude/skills/seo-structured-data/SKILL.md`](.claude/skills/seo-structured-data/SKILL.md) | Extend `@pakfactory/seo` generators only |
| **sanity-schema-author** | [`.claude/skills/sanity-schema-author/SKILL.md`](.claude/skills/sanity-schema-author/SKILL.md) | Studio schema authoring |
| **blog-jira-delivery** | [`.claude/skills/blog-jira-delivery/SKILL.md`](.claude/skills/blog-jira-delivery/SKILL.md) | Blog Jira story E2E → RFA |
| **deploy-www-release** | [`.claude/skills/deploy-www-release/SKILL.md`](.claude/skills/deploy-www-release/SKILL.md) | www rebuild handoff → PR `--base www-new-release` |

Invoke by name when the task matches. Cursor twins for some skills live under [`.cursor/skills/`](.cursor/skills/).

## Tooling preferences

- Prefer repository tools (read, search, apply_patch) over shell when file-scoped.
- Version-sensitive APIs: Context7 MCP (`resolve-library-id` → `query-docs`) per `AGENTS.md`.
- Package manager: **pnpm** only.
- Styling: `AGENTS.md` § UI + **`DESIGN.md`** — ui CSS → app CSS → `className`; 8pt spacing.

## JIRA workflow

Use **PROD** defaults in [`AGENTS.md`](./AGENTS.md). Blog ticket map: [`docs/blog-3-jira-conventions.md`](./docs/blog-3-jira-conventions.md). AI docs chore: [PROD-2452](https://dotdirect.atlassian.net/browse/PROD-2452).

When editing **`packages/seo`**, also read [`packages/seo/CLAUDE.md`](./packages/seo/CLAUDE.md).

## Sanity content guardrails

Agents edit **schemas in git only** — never write documents (no seeds, no MCP create/patch/publish). Binding: [`AGENTS.md`](./AGENTS.md) § Sanity content — agent guardrails.
