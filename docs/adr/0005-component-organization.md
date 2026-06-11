# ADR-005: Component organization — feature/domain grouping, routing-only `app/`

**Status:** Accepted (2026-06-10). **Revised same day (D6):** the original draft kept a colocation tier (`app/<route>/_components/`); we removed it in favour of a **routing-only `app/`** with all components under `src/components/`. Implemented in `apps/blog`; `apps/www` remediation deferred. Background analysis: [`docs/component-organization-audit.md`](../component-organization-audit.md) (this ADR is canonical; the audit is the reasoning behind it).

## Context

As `apps/blog` grew, shared components accumulated loose at the root of `src/components/`, and the working convention had been described as "group by the Sanity schema a component renders." That description happened to fit the blog (its features coincide with Sanity types) but is the wrong organizing principle in general, and it doesn't transfer to `apps/www` (which is not CMS-shaped). We need one turborepo-wide rule for **where a component lives** that scales across apps and across non-CMS features — and a clear answer to whether single-route components colocate in `app/` or live centrally.

## Decision

**`app/` is for routing only. Every React component lives under `src/components/`, grouped by feature/domain.** Two tiers:

| Tier | Location | Holds |
|------|----------|-------|
| 1 | `src/components/<feature>/` and `src/components/common/` | All application UI for one app, grouped by feature/domain; generic feature-agnostic pieces go in `common/`. |
| 2 | `@pakfactory/ui` | Generic primitives reused across apps. No app/business logic. |

Rules:

- **`app/` contains only routing files** — `page.tsx`, `route.ts`, `layout.tsx`, `not-found.tsx`, `sitemap.ts`, etc. No `_components/` folders; a route imports its components from `@/components/<feature>/…`.
- **Group by feature/domain, not schema or page (D2).** Schema grouping leaks the data model into the UI layer, leaves non-schema features (search, newsletter, pagination, breadcrumb) in a loose "misc" bucket, doesn't scale to non-CMS apps, and breaks for components that span multiple schemas. Feature folders (`post/`, `category/`, `tag/`, `author/`, `home/`, `search/`, `contribute/`…) are the unit; add a new one when a feature appears.
- **`common/` for generics (D3).** Feature-agnostic shared components live in `src/components/common/`; nothing sits loose at the root of `src/components/`.
- **`src/` is exactly `app/ components/ lib/`.** Nothing else at `src/` root (e.g. the Sanity client lives in `lib/sanity/`, never `src/sanity/`).
- **A component used by a single route still lives in `src/components/<feature>/`** — not next to the route. One obvious home per component; no judgment call about "single-use enough to colocate."
- **`@pakfactory/ui` is cross-app primitives only (D4).** The blog's `Breadcrumb` keeps its ergonomic `items[]` wrapper but composes the `@pakfactory/ui` breadcrumb primitive internally so styling can't drift. `@pakfactory/ui` has no pagination primitive, so the blog's `Pagination` is legitimately app-level; extract a generic pager only if `www` needs it.

### Naming (D5)

- **Components are PascalCase; files are kebab-case; the file name is the kebab-case of the exported component — 1:1.** `post-card.tsx` ↔ `PostCard`. No file/export drift, and no two files share a base name.
- **Name = domain/feature + archetype noun** — `PostCard`, `FilterSidebar`, `CategoryArchiveView`. Never a registry/design-tool ID (`hero-section-32`).
- **A component serving a single route may be route-descriptive** — `CategoryArchiveView` (in `components/category/`), `HomeHero` (in `components/home/`). A genuinely reusable, cross-feature component is *not* page-named.
- **Types/interfaces** PascalCase; **hooks** `useX`; **event handlers** `handleX`; **constants** `UPPER_SNAKE`.
- When a wrapper would collide with a library export (e.g. `@portabletext/react`'s `PortableText`), **alias the import** (`PortableText as PortableTextRoot`) rather than prefixing the wrapper — keep the file===export name clean.

### Why routing-only over colocation (D6)

Colocation (single-use components in `app/<route>/_components/`) is the Next.js *default* and is endorsed by bulletproof-react / FSD. We deliberately chose the other documented Next.js strategy — **"store application code outside `app/`; keep `app/` for routing"** — because for a small team the **uniformity** wins: there is exactly one place every component lives, `app/` stays a readable route map, and no one debates whether something is "single-use enough" to colocate. The accepted trade-off is **locality**: a route's pieces are no longer physically adjacent to it. Both are industry-standard; this is a values choice, recorded so it isn't re-litigated per PR.

## Scope

Enforced in `apps/blog` (the reference implementation) and `packages/ui`. `apps/www` remediation (registry-ID file names; single-use sections in shared folders) is **deferred** and adopts this standard when scheduled.

## Consequences

- `app/` is a pure routing map — every `.tsx` under it is a `page`/`layout`/`route`.
- The "where does this file go?" question has one answer: `src/components/<feature>/` (or `common/`), or `@pakfactory/ui` if cross-app.
- `apps/blog` is the canonical example to point new work at.
- Trade-off accepted: single-use components no longer sit next to their route (no colocation locality).
- A later, optional ESLint rule can forbid any non-routing file under `app/`.
