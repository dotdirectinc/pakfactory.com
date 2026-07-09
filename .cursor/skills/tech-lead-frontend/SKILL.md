---
name: tech-lead-frontend
description: >-
  Guides tech leads and senior frontend/fullstack engineers on React, Next.js,
  Tailwind, shadcn-style UI, accessibility, and client-side performance in this
  monorepo. Requires Context7 (user-context7) for current library APIs and best
  practices before giving version-sensitive advice. Use when reviewing or
  implementing UI, layouts, data fetching on the client, or frontend architecture.
---

# Tech lead — frontend (Context7-first)

## When to use this skill

Apply for **frontend** work: UI composition, Next.js app behavior, Tailwind/shadcn patterns, accessibility, client fetching, bundles and runtime performance, and **tech-lead-style** reviews (tradeoffs, boundaries, consistency).

---

## Mandatory: Context7 for up-to-date practice

Before stating **library-specific** APIs, defaults, deprecations, or “best practice” that depends on a **versioned** package or framework:

1. Use MCP server **`user-context7`**.
2. Call **`resolve-library-id`** with the **official** library or framework name and a **short, task-focused** `query` to obtain a `libraryId`.
3. Call **`query-docs`** with that `libraryId` and a **specific** `query` (exact API, pattern, or error).

Rules:

- Do **not** put secrets, credentials, API keys, personal data, or proprietary source into Context7 queries.
- **Resolve once per library per task** when possible; reuse the same `libraryId` for follow-up `query-docs` calls.
- If Context7 is **unavailable**, say so explicitly, then rely on **this repo’s source** and **links to official docs**—do not invent current-version behavior from memory.

Typical libraries to resolve as needed (non-exhaustive): **Next.js**, **React**, **Tailwind CSS**, **@tanstack/react-query**, **Sanity client** (browser usage), etc.

---

## Alignment with this repository

- Human-oriented Cursor defaults: [`.cursor/TECH_LEAD.md`](../../TECH_LEAD.md).
- Binding UI policy: [`workspace-instructions.mdc`](../../rules/workspace-instructions.mdc).

Summary for implementation (do not contradict those rules):

- Prefer layout and one-off styling in **app or block code** (e.g. `apps/www/src/components/...`, pages), not by rewriting shared primitives.
- Do **not** change `packages/ui/src/components` primitives except a **confirmed** bug you were asked to fix.
- Do **not** change `packages/ui/src/globals.css` or `apps/www/src/app/globals.css` for new features (no new tokens or drive-by `@theme` edits); use existing tokens and `className` in app/block code.
- Do **not** change root shell (`layout.tsx`, global navbar) unless the task explicitly asks.

---

## Tech-lead frontend checklist

**Architecture and composition**

- Prefer **composing** existing primitives and blocks over forking copies into app code.
- Clarify **Server vs Client** boundaries (what runs on the server vs in the browser); use Context7 for current Next.js/React patterns when unsure.

**Accessibility**

- Meaningful labels, focus order, keyboard interaction for interactive controls; respect reduced motion where applicable.
- When advising on ARIA or platform APIs, use Context7 or MDN-aligned official sources—not folklore.

**Performance**

- Avoid unnecessary client JS, waterfalls, and oversized client bundles; lazy-load where appropriate.
- Images: prefer framework-recommended patterns (e.g. Next image) after confirming with Context7 for the installed major version.

**Review tone**

- State **tradeoffs** (complexity, maintenance, a11y, perf) for non-trivial UI choices.
- Keep changes **scoped** and reviewable unless the user asked for a larger batch.
