---
name: sanity-schema-author
description: >-
  Author and modify Sanity Studio schemas for PakFactory (apps/studio/schemas):
  defineType/defineField/defineArrayMember, field groups (the content-team tab
  model), validation, initialValue, previews, desk structure, document actions,
  seed data, and typegen. Use for any Studio content-model work — e.g. the post
  document rebuild (PROD-1490) and the content-team field checklist (PROD-1601).
  Studio worktree / feature/sanity-studio-ux only.
---

# Sanity schema authoring (apps/studio)

The studio's purpose is a **CMS the content team actually enjoys** — for the blog now and
the main marketing site later. Schemas are the product. This skill is the core Studio
workflow; it lives on `feature/sanity-studio-ux` in the studio worktree.

## Preconditions

- **Worktree/branch:** `pakfactory.com-sanity-studio-ux` on `feature/sanity-studio-ux`. Schema work **never** rides on `feature/blog` (see `single-app-commits-and-branches.md`).
- **Source of truth:** `apps/studio/schemas/` (registered in `schemas/index.ts`), desk in `apps/studio/structure/`, actions in `apps/studio/actions/`, seeds in `apps/studio/scripts/{seed,seed-blog-dev}.mjs`.
- **Stack:** Sanity 5, TS 5, pnpm. Project `8293wrxp`; dev dataset **`development`**.
- Read [`AGENTS.md`](../../AGENTS.md) § Sanity and GROQ, and the content-team checklist (PROD-1601).

## Authoring rules

- Always **`defineType` / `defineField` / `defineArrayMember`**; never raw object literals. No hardcoded tokens — `process.env` only.
- **Group by the content-team mental model**, not data type. The Post model is a 6-tab `groups` layout (PROD-1601): Content / Categorization / Publishing / SEO / Social / Schema & AI. Default tab = most common task.
- **Validation + `initialValue`** make editors fast and safe: required where the checklist says required (e.g. featured-image alt), sensible defaults (e.g. tag `index` default per the SEO spec), unique slugs, no-self-redirect, etc.
- **Previews** (`preview` + `prepare`) on every document and array member so the desk and reference pickers are legible (the existing `contentWidget` uses an `internalTitle` for exactly this).
- **Reusable body blocks** are `contentWidget` + `widgetEmbed` references — edit once, update everywhere. Tier-1 widgets to add (PROD-1490): comparison table, stat callout, pull quote, callout, embed, internal-link card, data-viz. Prefer custom blocks over inline HTML/iframe for crawlability.
- **Desk + actions:** when you add a document type or a custom publish flow, wire `structure/` (browse lists; remember `documentTypeList(type).filter(...)` *replaces* the `_type` constraint — re-add it) and `actions/` (e.g. the `publishWithRedirect` action). 

## Procedure

1. **Plan against the checklist.** Map the target document's fields to PROD-1601; note which already exist (grep `apps/studio/schemas`). Prefer **additive** changes.
2. **Edit the schema** with groups/validation/initialValue/preview. Register new types in `schemas/index.ts`.
3. **Seed example data** in `scripts/seed.mjs` (and `seed-blog-dev.mjs` for blog-home volume) so the new field is exercised — idempotent `createOrReplace`.
4. **Typegen:** keep `pnpm sanity typegen` clean (PROD-1490 AC). If typegen isn't wired yet, set up `sanity schema extract` + `sanity-typegen.json` as part of the ticket — downstream GROQ types depend on it.
5. **Verify locally:** `pnpm dev:studio` (`:3333`), confirm the editor renders the groups/validation/preview as intended; run `pnpm --filter @pakfactory/studio build`.
6. **Commit** on `feature/sanity-studio-ux` (`feat(studio): …`), schema + seed + structure together. Then **`pnpm --filter @pakfactory/studio run deploy`** (`sanity deploy`) so the team Studio gets the schema and any document actions.
7. **Hand off the consumption** to the blog via the **schema-contract** skill — a deployed field isn't "done" until an app projects and renders it.

## Breaking changes → migrate

Renames, type changes, making a field required on existing docs, or default flips need a
**content backfill** (use the **sanity-migration** skill) *before* enforcement. The gap
analysis flagged several: required `alt`, `bio`→short/long split, tag-index default flip,
single→array author `sameAs`. Don't make a field required while published docs would fail it.

## Don't

- Don't edit schemas already relied on by a live app without confirming (see `confirm-approved-features.md`).
- Don't treat the stub `packages/sanity/src/schemas` as the source of truth — `apps/studio/schemas` wins.
- Don't bundle `apps/blog/**` changes into a studio commit.
