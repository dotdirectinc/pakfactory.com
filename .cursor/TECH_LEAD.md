# Cursor guide — tech lead / fullstack

Audience: tech leads and fullstack engineers using **Cursor** in this workspace. This doc covers **how we use Cursor**, **non-negotiable repo rules**, and **integrations (MCP)**. It is not product requirements or UX copy.

---

## 1. Repo reality check

This repository (**pakfactory.com**) is a **Turborepo**-style monorepo. Before relying on paths or scripts:

- Confirm the tree (e.g. `ls`, `git status`) on your branch; sparse or partial checkouts are possible in some setups.
- Do not assume every optional app or package exists until you verify.

Typical locations include `apps/www`, `apps/blog`, `apps/studio`, `packages/ui`, and `packages/sanity`.

---

## 2. Cursor rules (binding)

Canonical always-on policy lives in this repo:

**[`rules/workspace-instructions.mdc`](rules/workspace-instructions.mdc)**

Summary for day-to-day work:

| Do | Don’t |
|----|--------|
| Read **[`DESIGN.md`](../DESIGN.md)** before designing/building/planning UI; use token **names** from `@pakfactory/ui`. | Edit **`packages/ui/src/components`** primitives except a **confirmed bug** you were asked to fix. |
| Read **[`ENGINEERING.md`](../ENGINEERING.md)** before scaffolding React/Next (RSC, state, placement). | Merge or rewrite Accepted ADRs; use [`docs/adr/README.md`](../docs/adr/README.md) domain + Applies to index. |
| Fix layout/styling in **app or feature code** with existing tokens and `className`. | Drive-by change **`packages/ui/src/globals.css`** for a single feature (token evolution is a design-system / ADR act). |
| Add an app token in the app’s `globals.css` **only when ui lacks it**; if a second app needs it, move to `@pakfactory/ui` ([`AGENTS.md`](../AGENTS.md)). | Invent a parallel palette or copy unrelated design-system hex (e.g. Vercel blue). |
| Add **new** shadcn-style primitives only when needed (**additive**). | Change root **`layout.tsx`**, global shell, or navbar unless the task explicitly asks. |

Canonical engineering defaults: **[`AGENTS.md`](../AGENTS.md)**. Doc map: **[`docs/ai-agent-docs.md`](../docs/ai-agent-docs.md)**.

---

## 3. Intended architecture (full tree)

When the repo is intact, expect a **Turborepo**-style layout:

| Area | Role |
|------|------|
| **`apps/www`** | Main Next.js site; composes UI and Sanity-backed pages. |
| **`apps/blog`** | Blog Next app (if present). |
| **`apps/studio`** | Sanity Studio. |
| **`packages/ui`** | Shared **shadcn-style primitives** (buttons, cards, etc.). |
| **`packages/sanity`** | Schemas, GROQ, shared Sanity logic. |

**Rule of thumb:** primitives and tokens stay stable in `packages/ui`; product layout and marketing blocks live in **`apps/www`** (and similar app packages).

---

## 4. MCP: Figma

- Cursor registers Figma as MCP server **`user-Figma`** (name may show as “Figma” in Settings → MCP).
- **`whoami`** returns the authenticated user and **plans** (teams/orgs you can create files in). It does **not** list every file in a Figma project folder.
- To work on a file, use a **design** URL with a **`fileKey`**, e.g. `https://www.figma.com/design/<fileKey>/...`. Project URLs (`/files/team/.../project/...`) are not enough for file-scoped tools.
- For design → code or inspection, agents typically use **`get_design_context`** / **`get_metadata`** / **`get_screenshot`** with `fileKey` and `nodeId` as documented by the server.
- Slash commands such as **create design system rules** (Figma) are optional workflows for aligning Figma with the repo; keep output consistent with the workspace rules above.

---

## 5. Secrets and environment

- Prefer **repo-root** **`.env.local`** for local secrets; some apps symlink to it (e.g. `apps/www/.env.local` → `../../.env.local`).
- **Never commit** secrets or real `.env.local` contents.
- When introducing a new env var, document it in the relevant **`.env.example`** and add it to **`turbo.json`** `globalEnv` / task `env` lists (Turbo strips undeclared vars).
- Redact tokens and keys in screenshots, issues, and AI chat logs.

---

## 6. Practical Cursor usage

- **Context:** `@`-mention specific files or folders so the model grounds changes in real code.
- **Scope:** Keep tasks small (one feature, one bug); large refactors deserve explicit plans and review.
- **Agent vs Ask:** Use **Agent** when you want edits and tool use across the tree; use **Ask** for read-only exploration or design discussion.
- **Review:** Treat AI output like any PR: run typecheck/lint/build when the repo supports it; verify paths exist in your checkout.

---

## 7. Maintenance

Update this file when **team conventions**, **MCP servers**, or **repo layout** assumptions change so new tech leads are not misled.
