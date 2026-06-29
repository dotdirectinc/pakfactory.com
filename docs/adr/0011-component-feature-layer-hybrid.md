# ADR-011: Component feature + layer hybrid (amends ADR-008)

**Status:** Accepted (2026-06-26). **Amends [ADR-008](0008-component-archetype-grouping.md)** — keeps ADR-008's layer folders and ordered decision rule in force; adds a secondary feature-clustering axis for `apps/blog` only. **ADR-007 (inline single-route page views) remains in force.**

## Context

ADR-008 grouped `apps/blog/src/components/` by **archetype/layer** (`sections/ layout/ views/ modules/ ui/`). That choice correctly mirrors the Sanity page-builder (`sections/` ↔ `schemas/sections/`) and keeps architectural role visible.

In practice, two clustering needs emerged that ADR-008's pure layer model does not fully address:

1. **Multi-layer, single-page clusters** — the post detail surface spans layout, view, UI, and module concerns (`post-detail-layout`, `post-portable-text`, `post-faq-section`, etc.). These were colocated in a top-level `post/` folder before ADR-008 and remain the most natural place for editors and developers to find post-detail pieces.
2. **Same-layer feature clusters** — portable-text **widgets** (CTA, product card, callout) are all data-driven `modules/` renderers. At 3+ files, a flat `modules/` root with only a filename prefix is harder to scan than a dedicated `modules/widget/` subfolder.

ADR-008 explicitly accepted the cost that a single product feature's pieces may spread across layers. ADR-011 adds **optional feature clustering** without undoing the layer axis or the sacred `sections/` rule.

## Decision

**Primary axis remains layer/archetype (ADR-008).** A secondary **feature** axis is allowed under two rules:

### Rule A — Top-level feature folder

A **top-level folder** directly under `src/components/` (alongside `sections/ layout/ views/ modules/ ui/`) is allowed when a cluster:

- spans **2+ layers**, and
- is bound to a **single page/route surface**.

**Example:** `post/` — post-detail components used only on the post detail page (`post-detail-layout`, `post-portable-text`, `post-faq-section`, …).

### Rule B — Feature subfolder inside one layer

A **feature subfolder inside a layer** is allowed when a cluster:

- is **3+ files**, and
- all files belong to the **same layer**.

**Examples:**

- `modules/widget/` — `widget-renderer`, `widget-cta`, `widget-product-card` (portable-text reference widgets: CTA, product card).
- `modules/filter/` — `filter-sidebar`, `filter-active`, `filter-archive-sidebar` (faceted archive filters and `/all` browse nav).
- `modules/inline/` — `body-callout`, ... (inline post-body blocks authored in place; mirrors Studio `schemas/inline/`). A 1-2 file group is allowed here ahead of the 3-file threshold because it pairs 1:1 with the Studio `schemas/inline/` group and is expected to grow.

Clusters with **fewer than 3 files** stay flat in their layer with a **prefix-first filename** (ADR-008), e.g. `modules/post-card.tsx`, `modules/filter-sidebar.tsx`.

### Sacred rule — `sections/` unchanged

`sections/` remains **page-builder sections only**, mirroring Studio `schemas/sections/` 1:1 for the `_type → component` resolver. Never nested under another layer; never subdivided by feature.

### Naming (unchanged)

ADR-005 D5 and ADR-008 prefix-first stems still apply: kebab-case files, file name === exported component (`widget-cta.tsx` ↔ `WidgetCta`).

## Where does this file go? (updated decision rule)

Answer in order — first match wins:

1. Editor places it in the Sanity page builder? → **`sections/`** (no feature subfolders)
2. Site-wide chrome (nav / footer / page frame)? → **`layout/`**
3. Whole-page template shared by 2+ routes? → **`views/`** (single-route view stays inline in `page.tsx` per ADR-007)
4. Cluster spans 2+ layers and is bound to one page/route surface? → **top-level feature folder** (e.g. `post/`)
5. Fetches or receives Sanity data, or runs a server action? → **`modules/`** (use `modules/<feature>/` when Rule B applies)
6. Otherwise (presentational primitive, no data) → **`ui/`** (promote to `@pakfactory/ui` when a second app needs it)

## Scope

`apps/blog/src/components/` only. `packages/ui` unchanged. `apps/www` deferred.

## Consequences

- `post/` is a **legitimate** top-level feature folder, not an ADR-008 violation.
- New portable-text widget renderers live in **`modules/widget/`**.
- Existing flat `modules/` files (e.g. `filter-*`) may migrate to feature subfolders opportunistically; no big-bang reorg required.
- ADR-008 remains the historical record for the layer model; its grouping axis is **amended**, not replaced.
