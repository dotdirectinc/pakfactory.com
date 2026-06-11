# Component Organization Audit & Standard

> **Canonical:** ratified as [ADR-005](adr/0005-component-organization.md) — that record wins on conflict. This document is the background analysis and rationale behind it.
>
> **Revised:** ADR-005 D6 removed the **Tier-1 colocation** (`app/<route>/_components/`) described below — `app/` is now **routing-only** and every component lives in `src/components/<feature>/`. The feature/domain grouping and `common/` rationale here still hold; only the colocation location changed.

Status: Ratified as ADR-005; `apps/blog` `common/` reorg implemented
Date: 2026-06-10
Scope: `apps/blog` and `packages/ui` only. `apps/www` is explicitly **out of scope** for now (tracked as future work).

## Purpose

Establish the foundational, turborepo-wide standard for where React components live, validated first against `apps/blog` (the reference implementation) and `packages/ui`. The goal is a clean `src/` where reusable components are shared and single-use components stay colocated.

---

## The standard (three tiers, feature/domain grouping)

```
Tier 1  app/<route>/_components/      single-route only (the "_" hides it from routing)
Tier 2  src/components/<feature>/     shared across routes within one app
        src/components/common/        generic, feature-agnostic shared components
Tier 3  @pakfactory/ui                generic primitives reused across apps
```

Rules:

- **Default to colocated (Tier 1).** A component imported by exactly one route lives in that route's `_components/`.
- **Promote to Tier 2 on the 2nd consumer** (or proactively when the design clearly implies reuse). Group by **feature/domain**, with a `common/` folder for generic pieces.
- **Promote to Tier 3** only when a component is generic and reused across apps. App/business logic never goes in `@pakfactory/ui`.
- **Name by intent, never by page or registry ID.** No `home-hero`, no `hero-section-32`.
- **`src/` stays `app/ components/ lib/` only.**
- A route must not import another route's `_components/`.

---

## Decisions (locked)

### D1 — Scope: `apps/blog` + `packages/ui` only

`apps/www` remediation (no colocation tier, registry-ID names) is deferred. Decisions here become the standard `www` will later adopt.

### D2 — Grouping basis is feature/domain, NOT Sanity schema

**Yes, feature/domain is the better practice.** Schema-based grouping (`post/`, `category/`, `tag/`, `author/`) happens to work in the blog only because those schemas coincide with product features. It is the wrong organizing principle in general because:

- **Not every component maps to a schema.** Search, newsletter, RFQ CTA, filtering, pagination, breadcrumb have no Sanity type, so schema-grouping forces them into a loose "misc" bucket (exactly today's loose root files).
- **It leaks the data model into the UI layer.** UI organization should reflect what the code does for the product ("screaming architecture"), not where its data originates.
- **It doesn't scale across apps.** `www` is not CMS-shaped; a feature/domain rule applies uniformly to every app in the turborepo.
- **Components can span multiple schemas.** A card that shows a post + its author + category has no single "owning" schema.

Practical effect for the blog: the existing folders (`post/`, `category/`, `tag/`, `author/`) are **kept** — they are already valid feature/domain names. The basis is just redefined as feature/domain so future non-schema features get first-class folders.

### D3 — Add `apps/blog/src/components/common/` for generic items

Generic, feature-agnostic components currently loose at the root of `src/components/` move into `common/`:

- `pagination.tsx`
- `breadcrumb.tsx`
- `portable-text.tsx`
- `active-filters.tsx`
- `filter-sidebar.tsx`
- `search-form.tsx`
- `rfq-cta.tsx`
- `newsletter-cta-band.tsx`

Result: nothing sits loose at the root of `src/components/` — every file is under a feature folder or `common/`.

### D4 — Tier 2 ↔ Tier 3 overlap resolution

- **`breadcrumb`**: the blog's `Breadcrumb` is a convenience wrapper with an array (`items[]`) API and does **not** use the `@pakfactory/ui` `breadcrumb` compound primitive. Decision: keep the app-level wrapper (the array API is ergonomic) but it **should compose** the `@pakfactory/ui` primitive internally so styling can't drift. Lands in `common/`. Non-blocking follow-up.
- **`pagination`**: `@pakfactory/ui` has **no** pagination primitive, so the blog's `Pagination` is legitimately Tier 2. Decision: keep it in `common/` as-is. Consider extracting a generic pager to `@pakfactory/ui` later only if `www` needs it.

---

## Current state assessment

### `apps/blog` — strong, minor polish

Gets right (keep as the template):

- Clean `src/` = `app/ components/ lib/`.
- Real three-tier separation: single-route glue colocated (e.g. `app/[category]/_components/archive-view.tsx`) while the shared shell is extracted to `components/post/post-archive.tsx`. Not duplication.
- Shared components already grouped into feature folders.

Gaps (addressed by D2–D4):

- No `common/` folder; generic components sit loose at the root of `components/`.
- Grouping was described as "by Sanity schema"; redefined to feature/domain.
- `breadcrumb`/`pagination` reimplement vs. the `@pakfactory/ui` layer (see D4).

### `packages/ui` — healthy

- ~23 generic primitives (`button`, `card`, `badge`, `input`, `select`, `breadcrumb`, etc.) + `globals.css` + `lib/utils.ts`. Correctly cross-app and free of business logic. No change required beyond the optional `breadcrumb` composition in D4.

---

## Target structure for `apps/blog/src/components`

```
components/
  common/                 # D3 — generic, feature-agnostic
    active-filters.tsx
    breadcrumb.tsx        # composes @pakfactory/ui breadcrumb (D4)
    filter-sidebar.tsx
    newsletter-cta-band.tsx
    pagination.tsx
    portable-text.tsx
    rfq-cta.tsx
    search-form.tsx
  post/
    post-archive.tsx
    post-article.tsx
    post-card.tsx
    post-popular-rail.tsx
  category/
    category-chips.tsx
    category-posts-row.tsx
  tag/
    tag-strip.tsx
  author/
    author-header.tsx
```

Tier 1 colocations stay where they are (`app/_components/`, `app/all/_components/`, `app/[category]/_components/`, `app/tag/[slug]/_components/`, `app/author/[slug]/_components/`, `app/search/_components/`, `app/contribute/_components/`).

---

## Remediation backlog (for when execution is approved)

1. Create `apps/blog/src/components/common/` and move the eight generic files (D3); update imports from `@/components/<file>` to `@/components/common/<file>`.
2. Make `common/breadcrumb` compose the `@pakfactory/ui` breadcrumb primitive (D4).
3. Update `apps/blog/CLAUDE.md` "Components and files" section: grouping basis = feature/domain; document `common/`.
4. (Optional, mechanical enforcement) Add an ESLint `import/no-restricted-paths` zone so a route cannot import another route's `_components/`.
5. (Future, out of scope) Apply the same standard to `apps/www`: introduce the colocation tier, rename registry-ID files, move single-use sections out of the shared folder.

## Open items

- Whether to lift the missing management-root rule files (`components-by-reusability.md`, `clean-src-structure.md`, referenced by root `CLAUDE.md` but absent on disk) into existence as the canonical written standard, or keep the standard in `AGENTS.md` / app `CLAUDE.md`.
