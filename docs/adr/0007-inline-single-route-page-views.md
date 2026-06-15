# ADR-007: Inline single-route page views (revises ADR-005 D6)

**Status:** Accepted (2026-06-10). **Revises ADR-005 D6.** Implemented in `apps/blog`; `apps/www` deferred.

> Recorded retroactively (2026-06-12) — this decision was already in force and referenced by `apps/blog/CLAUDE.md`, but the ADR file had not been written. The grouping axis it sits on was later changed by [ADR-008](0008-component-archetype-grouping.md); the inline-vs-component rule here is unaffected by that change.

## Context

ADR-005 D6 made `app/` routing-only and pushed **every** component — including whole-page views used by a single route — into `src/components/`. In practice, a view rendered by exactly one route gains nothing from living in a shared folder: it is not reused, the indirection hurts locality, and it invites premature "what props should this take" generalization. Meanwhile, views genuinely shared by several routes (a page-1 archive and its `/page/[n]` paginated sibling) clearly *should* be shared components.

## Decision

**Single-route whole-page view → inline; multi-route view → component.**

- A **whole-page view rendered by exactly one route** is written **inline in that route's `page.tsx`**, with any private sub-components/helpers in the same file. Examples: the post detail in `app/[category]/page.tsx`; search in `app/search/page.tsx`.
- A **view shared by 2+ routes** stays an importable component. Examples: `category-archive-view`, `tag-archive-view`, and `all-archive-view` are each used by a page-1 route **and** its `/page/[n]` route. (Under [ADR-008](0008-component-archetype-grouping.md) these live in `components/views/`.)
- **`app/` never holds an importable component or a `_components/` folder.** If an inlined view later needs a second route, **extract it** to the appropriate `src/components/` folder at that point.

## Scope

`apps/blog`. `apps/www` deferred.

## Consequences

- `app/` stays a readable route map; single-route view code is local to its route.
- The "inline or component?" test is mechanical: count the routes that render it (1 → inline, 2+ → component).
- Trade-off: a single-route view's JSX lives in `page.tsx` rather than a named component file — accepted for locality.
- Compatible with both ADR-005 (feature/domain) and ADR-008 (archetype) grouping — it governs *whether* a view is a component, not *where* that component lives.
