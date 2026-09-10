# AI agent documentation map (PROD-2452)

How markdown and Cursor rules are organized so **Cursor and Claude** share one hierarchy. Do not add fat digests that restate or contradict canon.

## Read order

| Task | Read first |
| --- | --- |
| Any change | [`AGENTS.md`](../AGENTS.md) → relevant [`docs/adr/`](adr/README.md) |
| Design / build / plan UI | [`DESIGN.md`](../DESIGN.md) → [`packages/ui/src/globals.css`](../packages/ui/src/globals.css) |
| Blog | [`apps/blog/CLAUDE.md`](../apps/blog/CLAUDE.md) |
| www rebuild | [`apps/www/CLAUDE.md`](../apps/www/CLAUDE.md) |
| Studio schema | [`apps/studio/CLAUDE.md`](../apps/studio/CLAUDE.md) |
| Admin | [`apps/admin/AGENTS.md`](../apps/admin/AGENTS.md) |
| Ops / env / seeds | `apps/*/memory.md` (**ops only** — never overrides canon) |

## Layers

| Layer | Files | Restate policy? |
| --- | --- | --- |
| Canon | `AGENTS.md`, Accepted `docs/adr/*` | Full — source of truth |
| UI compose | `DESIGN.md` | Token **names** + composition; values → CSS |
| Tokens | `packages/ui/src/globals.css` | Implementation SoT |
| App contract | `apps/*/CLAUDE.md` or `apps/admin/AGENTS.md` | App detail only |
| Map | this file | Index only |
| Cursor digests | `.cursor/rules/*.mdc`, `apps/*/.cursor/rules/*.mdc` | **Thin pointers** — never fork AGENTS |
| Claude entry | `CLAUDE.md`, `.claude/rules/*` | Tool-only |
| Skills | `.claude/skills/*`, `.cursor/skills/*` | Point to AGENTS / DESIGN / app CLAUDE |
| Ops | `apps/*/memory.md` | Never override canon |

## Cursor rules allowlist (`.cursor/rules/`)

| File | Role |
| --- | --- |
| `workspace-instructions.mdc` | Always-on: ADRs, UI primitives, cascade, → DESIGN.md |
| `pakfactory-stack.mdc` | Always-on: thin stack/domain highlights → AGENTS |
| `jira-branch-workflow.mdc` | Always-on: summary → AGENTS § JIRA |
| `shadcn-studio.instructions.mdc` | shadcn/studio MCP workflow only |
| `agent-toolkit.mdc` | Sanity MCP Knowledge Router + no document writes (no Shopify routing) |

**Do not** re-add Shopify/Hydrogen ecommerce studio rules. PakFactory is not a Shopify storefront (`AGENTS.md`).

App digests: `apps/<app>/.cursor/rules/<app>.mdc` — `alwaysApply: false`, `globs: apps/<app>/**/*`, ≤ ~25 lines, must match app CLAUDE.

## Thinning rules

1. One source of truth per fact.
2. Digests: link or one-line reminder only.
3. Skills must not contradict AGENTS / DESIGN.
4. `memory.md` = ops/history banner at top; defer to CLAUDE / AGENTS / DESIGN.
5. Branching / PR bases: **[`AGENTS.md`](../AGENTS.md)** § JIRA defaults only (no separate `docs/branching.md`).

## Related

- Follow-up to [PROD-1516](https://dotdirect.atlassian.net/browse/PROD-1516); this map shipped under [PROD-2452](https://dotdirect.atlassian.net/browse/PROD-2452).
