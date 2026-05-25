---
name: blog-jira-delivery
description: >-
  End-to-end delivery for PakFactory Blog 3.0 Jira stories (PROD-*): read ticket,
  plan against apps/studio schemas, update memory.md and blog-3-jira-conventions.md,
  implement on feature/blog, verify build, commit, transition Jira to Request For Approval.
---

# Blog Jira delivery workflow

Use this skill when the user asks to implement a Blog 3.0 story, move a PROD ticket forward, or repeat the same procedure across tickets.

## Preconditions

- Branch: `feature/blog` (or `feat/PROD-###-slug` per team habit).
- **Schema source of truth:** `apps/studio/schemas/` and `apps/studio/scripts/seed.mjs` — never `studio-old` or stub `packages/sanity` post schema for CMS fields.
- **Stack:** pnpm only; JSON-LD via `@pakfactory/seo`; GROQ in `packages/sanity/src/queries/` (re-export `queries.ts`); no edits to `packages/ui/src/components` or shared `globals.css`.
- Read [`AGENTS.md`](../../../AGENTS.md), [`apps/blog/CLAUDE.md`](../../../apps/blog/CLAUDE.md), [`docs/blog-3-jira-conventions.md`](../../../docs/blog-3-jira-conventions.md).

## Phase 1 — Intake (Jira + repo)

1. Fetch the Jira issue (Atlassian MCP: `getJiraIssue`, cloudId from site).
2. Transition to **In Progress** (`transitionJiraIssue`, transition id `61` on Product project).
3. Grep repo for existing routes, queries, and `_components` to avoid duplicate work.

## Phase 2 — Plan (print to user)

Produce a short markdown plan:

| Section | Content |
|---------|---------|
| Goal | One sentence from Jira description |
| Studio fields | List document types / fields used |
| GROQ | New queries file or `queries/blog.ts` exports |
| Routes / files | Table of deliverables |
| Reuse | Prior `_components` (404 rail, newsletter, RFQ, etc.) |
| Out of scope | Copy from Jira |
| Verify | `pnpm build:blog`, curl URLs with `/blog` basePath |

## Phase 3 — Document before code

1. Append a **PROD-####** section to [`apps/blog/memory.md`](../../../apps/blog/memory.md) (phases + file table).
2. When done, add a row to [`docs/blog-3-jira-conventions.md`](../../../docs/blog-3-jira-conventions.md) and a `## PROD-####` binding section.

## Phase 4 — Implement

- Server Components by default; `export const revalidate = 60` unless specified.
- `generateMetadata` + `getBlogRobotsDirective` / listing helpers from `apps/blog/src/lib/seo.ts`.
- Colocate UI under `apps/blog/src/app/_components/` or `src/app/<route>/_components/`.
- If CMS needs a new field, add it in **`apps/studio/schemas`** only (additive); update seed when helpful.

## Phase 5 — Verify

```bash
pnpm --filter @pakfactory/blog typecheck
pnpm build:blog
```

Optional: `curl -sI http://localhost:3001/blog/...` for status/robots.

## Phase 6 — Commit + Jira handoff

1. Commit: `PROD-####: short summary` + `Refs: PROD-####` in body.
2. Transition issue to **Request For Approval** (transition id `51`).
3. Comment on Jira: branch, commit SHA, shipped list, verify commands.
4. Print **implementation summary** for the user (files, behavior, ops follow-ups).

Do **not** push or open PR unless the user asks.

## Automation options

| Approach | When |
|----------|------|
| **This skill** | Cursor / Claude Code; invoke by name for each ticket |
| **Cursor rule** | Add `apps/blog/.cursor/rules/blog-delivery.mdc` pointing to this skill for PROD-* edits |
| **CI** | Only for lint/build; Jira transitions stay human or MCP-assisted |
| **Composite** | User says: "Run blog-jira-delivery for PROD-1499" → agent follows phases 1–6 |

## Ticket chain reference (Blog 3.0 stream)

Common order: infra (1495/1496) → home (1497) → archives/search (1499/1503) → 404 (1506). Always read the ticket AC; dependencies may be partially implemented on `feature/blog`.
