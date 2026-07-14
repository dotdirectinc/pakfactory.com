---
name: tech-lead-backend
description: >-
  Guides tech leads and senior backend/fullstack engineers on APIs, server-side
  Next.js patterns, Node runtime behavior, Sanity/GROQ, env and secrets hygiene,
  caching, and reliability. Requires Context7 (user-context7) for current SDK
  and framework documentation before giving version-sensitive advice. Use when
  designing or reviewing server logic, integrations, data access, or operational safety.
---

# Tech lead — backend (Context7-first)

## When to use this skill

Apply for **backend** and **server-side** work: HTTP APIs, route handlers and server actions, validation, errors, logging, caching, background/async patterns, **Sanity** (schemas, GROQ, studio-adjacent server usage), environment configuration, and **tech-lead-style** reviews (security, idempotency, blast radius).

---

## Mandatory: Context7 for up-to-date practice

Before stating **library-specific** APIs, defaults, deprecations, or “best practice” that depends on a **versioned** SDK, framework, or CLI:

1. Use MCP server **`user-context7`**.
2. Call **`resolve-library-id`** with the **official** library or product name and a **short, task-focused** `query` to obtain a `libraryId`.
3. Call **`query-docs`** with that `libraryId` and a **specific** `query` (exact API, server pattern, or error).

Rules:

- Do **not** put secrets, credentials, API keys, personal data, or proprietary source into Context7 queries.
- **Resolve once per library per task** when possible; reuse the same `libraryId` for follow-up `query-docs` calls.
- If Context7 is **unavailable**, say so explicitly, then rely on **this repo’s source** and **links to official docs**—do not invent current-version behavior from memory.

Typical libraries and products to resolve as needed (non-exhaustive): **Next.js** (server), **Node.js**, **@sanity/client**, **groq**, **zod**, **Prisma** or other ORMs if present in the project, etc.

---

## Alignment with this repository

- Human-oriented Cursor defaults: [`.cursor/TECH_LEAD.md`](../../TECH_LEAD.md).
- Binding UI policy still applies when server code **feeds** the UI; primitives/globals rules live in [`workspace-instructions.mdc`](../../rules/workspace-instructions.mdc).

---

## Tech-lead backend checklist

**APIs and server boundaries**

- Clear **validation** at trust boundaries; consistent **error shapes** and status codes; avoid leaking stack traces or secrets in responses.
- Prefer **idempotent** patterns where retries are likely (webhooks, uploads, payments).

**Security and hygiene**

- **Secrets** only via env vars; never commit real `.env` values; redact in logs and examples.
- **Destructive** work (migrations that drop data, production deploys, bulk deletes) requires **explicit** user intent; summarize impact first.

**Sanity and content APIs**

- When advising on GROQ, listeners, mutations, or client options, **use Context7** for the installed Sanity stack rather than guessing API shapes.

**Observability**

- Log **useful** context without PII or tokens; structured logs when the codebase already does.

**Performance and reliability**

- Timeouts, retries with backoff where appropriate; respect rate limits on third-party APIs.
- Caching: name **invalidation** and **staleness** tradeoffs for anything user-visible.

**Review tone**

- State **tradeoffs** (complexity, security, operability) for non-trivial server design.
- Keep changes **scoped** and reviewable unless the user asked for a larger batch.
