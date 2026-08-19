# ADR-015: Page-composition terminology — "Sections", platform-wide

**Status:** Proposed (2026-08-18) — **pending Eric's ratification**. **Supersedes the terminology of [ADR-012](0012-page-block-terminology.md)** ("block, not section"). ADR-012's mechanical consequences that already shipped (folder `schemas/blocks/`, `BlockRenderer`, `BlockItemPreview`, the `pageBuilder*` field/type names) are **not** reverted by this ADR — see "Scope" below.

## Context

The page-composition concept has now flipped names three times:

- **ADR-008** (2026-06-17): "section".
- **ADR-012** (2026-07-07): reversed to "block", ratified by product as the canonical editor and developer term for page-builder array members. Studio tab "Page blocks", folders `schemas/blocks/`.
- **Content-model initiative** (PROD-2134, `Conventions.md` §2.4, 2026-08): reintroduces **"Sections"** — a fixed tab named "Sections" in the eight-tab set, a platform-wide sections framework, and a rename of `blogPage.pageBuilder` → `sections` (PROD-2293).

The content-model handbook is the newer, **platform-wide** spec and the canon for the whole PROD-2134 epic — it governs Products, Listing pages, and every new area type, not just the blog. ADR-012 was scoped to the blog page-builder only. Rather than let the two coexist (a "Sections" tab on new types and a "Page blocks" tab on the blog, for the same idea), the content-model direction standardises on **Sections** everywhere.

This is a genuine reversal of a ratified ADR, so it is recorded as its own decision and held **Proposed until Eric confirms** the terminology change — the same person owns both the ADR register and `Conventions.md`.

## Decision

Use **"Sections"** for the page-composition concept in editor-facing labels and in new shared code:

| Layer | Term | Examples |
| ----- | ---- | -------- |
| Studio tab (field group) | **Sections** | The `sections` group in the §2.4 tab set (`lib/field-groups.ts`) |
| Shared field | `sections` | `sectionsField()` — one `sections` array per page-shaped type (`lib/sections.ts`) |
| Shared framework | "sections framework" | `lib/sections.ts`, `lib/row-section-fields.ts` |
| New content fields | `sections` | New area/page types (Products, Listing pages, …) |

Each page-shaped type carries **one** `sections` field, scoped by an `allow` list — never two section fields on one form (§2.4).

## Scope and what is NOT changed here

- **Foundations (PROD-2286)** adopts this for the shared framework and the tab name. That is the scope of the change landing with this ADR.
- **The blog's existing `pageBuilder` / `pageBuilderHome` / `pageBuilderLanding` field and type names, and the `schemas/blocks/` folder, stay as they are for now.** Renaming the blog's persisted field (`pageBuilder` → `sections`) is a **content migration owned by PROD-2293**, gated on this ADR being ratified. Foundations does not touch blog page-builder naming.
- **Unrelated "section" uses** (footer nav `sections`, layout components, `<section>` HTML, `apps/www`) are untouched, exactly as ADR-012 already carved out.

## Consequences

- New types compose from `sectionsField()` / `rowSectionFields()` and see a **Sections** tab.
- ADR-012 is **superseded on terminology only**; its shipped folder/renderer/preview names remain valid until a separate, deliberate rename (not in scope here).
- If Eric does **not** ratify, this ADR moves to Rejected and Foundations' tab/field/framework are renamed to the ADR-012 "block" vocabulary — a mechanical rename of `lib/field-groups.ts` (`sections` group), `lib/sections.ts`, and `lib/row-section-fields.ts`.
