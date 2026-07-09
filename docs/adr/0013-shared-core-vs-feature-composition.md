# ADR-013: Shared core vs feature composition (reuse without coupling)

**Status:** Accepted (2026-07-08). **Extends [ADR-005](0005-component-organization.md) / [ADR-008](0008-component-archetype-grouping.md) / [ADR-011](0011-component-feature-layer-hybrid.md)** — adds a reuse doctrine for how features share UI and logic. Does not change the layer folders or the ordered "where does this file go?" rule.

## Context

Building the blog `/search` listing (PROD-1950) surfaced a recurring question: the search results listing looks and behaves like the topic-detail listing (a "Filter by" category control + a "Sort by" select + a paginated post grid), and the no-results state reuses the same topic-chip row the 404 page shows.

Two tempting-but-wrong reactions:

1. **Reuse the whole feature component** — import `TopicFilterBar` / `TopicListingSection` / `TopicRelatedPills` directly into search. This **couples** unrelated features: search now depends on topic-detail wiring (topic sort options, topic URL params, topic data shapes), and a change for one page risks the other.
2. **Fork everything** — copy the topic components into search and edit. This **duplicates logic** (dropdown/sort markup, chip markup, keyboard semantics) that then drifts out of sync.

Both are avoidable. The right split is between the **shared, reusable core** (presentation + interaction logic) and the **feature-specific composition** (data fetching, URL/state wiring, feature copy).

## Decision

**Extract the shared core as controlled, presentational primitives; let each feature own its composition and wiring. Do not fork whole feature components, and do not import one feature's component into another feature.**

### 1. Shared core = controlled presentational primitives (props-only)

A shared primitive:

- is **props-only**: no data fetching, no `useRouter`/URL reads, no feature-specific strings or hrefs;
- is **controlled**: parent supplies values + change callbacks (`value` / `onChange`), the primitive owns only ephemeral UI state (open/closed);
- lives under **`ui/`** (ADR-011 rule 6), and is promoted to `@pakfactory/ui` only when a second app needs it.

Examples introduced here:

- **`ListingFilterBar`** (`ui/`) — the "Filter by" multiselect + "Sort by" select row. Props: `filterGroups`, `selected`, `onToggle`, `onClear`, `sortOptions`, `sortValue`, `onSortChange`.
- **`TopicChipRow`** (`ui/`) — label + topic chips + trailing "explore" link. Props: `label`, `topics` ({ `title`, `href` }), `exploreHref`.

### 2. Feature composition = controllers + page (owns data + URL)

Each feature builds a thin **controller** that composes the primitive and owns the wiring:

- fetches/receives Sanity data and maps it to primitive props;
- reads and writes URL/query state (builds hrefs, `router.push`);
- supplies feature copy and sort/filter option sets.

Controllers live in **`modules/`** (ADR-011 rule 5, data/URL aware). Example: **`SearchFilterBar`** (`modules/`) composes `ListingFilterBar`, supplies search sort options + category options, and pushes `searchPageHref(...)` on change.

### 3. No cross-feature component imports

A feature (`search`, `topic`, `post`, …) must not import another feature's controller/view. Shared behavior goes through a `ui/` primitive (or a `lib/` helper for non-UI logic), never through a sibling feature's component.

## Relationship to existing ADRs

- **ADR-005 / ADR-008 / ADR-011** still decide *where a file goes*. ADR-013 decides *how to split responsibilities* so the answer to "reuse or fork?" is neither — extract the core.
- Non-UI shared logic keeps following existing patterns (`lib/` helpers such as `getPaginationWindow`, `toPostCardDataList`; GROQ in `packages/sanity`).

## Migration (follow-up, not big-bang)

`TopicFilterBar` and `TopicRelatedPills` predate this ADR and currently bundle presentation + local state. They are the **migration target**: refactor them to compose `ListingFilterBar` / `TopicChipRow`. Until then, temporary parallel implementations are accepted (no shipped page is touched by PROD-1950). Migrate opportunistically when those pages are next in scope.

## Scope

`apps/blog/src/components/` (and `@pakfactory/ui` when promoted). `apps/www` deferred, but the same doctrine applies when it adopts the layer model.

## Consequences

- Search ships its own composition without depending on the topic feature, and without duplicating the filter/chip logic.
- New listing/discovery surfaces compose the same `ui/` primitives; feature copy + data + URL wiring stay in the feature.
- One more small indirection (primitive + controller) per shared surface — accepted for decoupling + testability.
- Reviewers reject PRs that import one feature's component into another, or that fork a feature component instead of extracting a `ui/` primitive.
