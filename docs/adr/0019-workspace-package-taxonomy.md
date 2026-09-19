# ADR-019: Workspace package taxonomy

**Status:** Accepted (2026-09-19). **Applies to:** `all`. Complements [ADR-006](0006-design-system-and-tokens.md) (tokens in `@pakfactory/ui`) and [ADR-013](0013-shared-core-vs-feature-composition.md) (shared core vs feature composition). Does not invent a novel layout — adopts **Turborepo apps/packages** plus **platform vs product** packaging used across industry monorepos.

## Context

The monorepo grew many `packages/*` entries. Agents and humans need a stable answer to: *where does new shared code go?* Without a role model, we risk a second design system (`@pakfactory/components` vs `@pakfactory/ui`), feature packages without a second consumer, and one-off “utils” packages that never earn their folder.

Industry default for this stack (Turborepo / Vercel-style): **`apps/` = deployables**, **`packages/` = shared libraries**, extracted when a **second app** needs the code or the code is clearly platform (design system, CMS SDK, SEO generators, auth client).

## Decision

### 1. Classify every workspace package by role

| Role | Meaning | Packages today |
| --- | --- | --- |
| **Platform** | Slow-changing foundations consumed by many apps | `ui`, `sanity`, `utilities`, `seo`, `supabase` |
| **Domain** | Business types/rules without React | `domain` (+ `geo` until folded) |
| **Infra / web ops** | Shared technical SDKs with tests | `redirects`, `sitemap` |
| **Feature** | Multi-app product UI / composed shells | `auth-ui`, `brief-builder-ui`, `components` (**extract-pending**) |

Human index: [`packages/README.md`](../../packages/README.md). Agent front door: [`AGENTS.md`](../../AGENTS.md) § Workspace packages.

### 2. Promotion rules (binding)

1. **Default to the owning app** (`apps/www`, `apps/blog`, `apps/admin`, `apps/studio`).
2. **Extract to `packages/`** only when a **second app** imports it, or it is clearly platform (tokens, Sanity queries/helpers, SEO generators, auth client/session).
3. **One design system:** primitives and tokens live in `@pakfactory/ui` (ADR-006 / ADR-013). Do **not** grow a second DS under `@pakfactory/components`.
4. **Feature packages** (`*-ui`, composed chrome) are allowed only for genuine multi-app composition. Prefer promoting props-only bits into `@pakfactory/ui` over adding new feature packages.
5. Do **not** invent alternate taxonomies per ticket. Change this ADR via a superseding ADR if the model must change.

### 3. `@pakfactory/components` — extract-pending (binding direction)

`@pakfactory/components` is a **feature** package shared by www + blog. It overlaps `@pakfactory/ui` (ui already has props-only `SiteNav`, `SiteFooter`, and shadcn `breadcrumb`). New work must **not** add files there; prefer `@pakfactory/ui` or app composition.

**Inventory (direction for follow-up PRs — not executed by this ADR alone):**

| Cluster | Extract to | Notes |
| --- | --- | --- |
| Breadcrumb trail (`layout/breadcrumb.tsx`) | `@pakfactory/ui` | Thin composition over ui primitives |
| Pagination + path/window helpers | `@pakfactory/ui` + `@pakfactory/utilities` | Highest-value Phase 1 |
| Gallery slider | `@pakfactory/ui` | Shared media module |
| Watermark (React + pure geometry/variant) | `@pakfactory/ui` + `@pakfactory/utilities` | Keep as one cluster |
| Site nav / footer chrome in components | Migrate call sites to **existing** `@pakfactory/ui` shells, then delete | Parallel stack — do not promote a second chrome |
| `external-link` helper | Fold with chrome migration | Tiny |

**Extraction phases (follow-up PRs):**

1. Listing primitives (pagination, breadcrumb trail, path/window helpers) → `ui` / `utilities`.
2. Watermark cluster → `ui` / `utilities`.
3. Chrome: migrate SiteNav/SiteFooter call sites to `@pakfactory/ui`; delete components `layout/*`.
4. Retire `@pakfactory/components` when empty; drop workspace deps.

### 4. Other deferred consolidations

- Fold `@pakfactory/geo` into `domain` or `utilities` when convenient.
- Revisit `auth-ui` / `brief-builder-ui` as long-lived feature packages vs promoting presentational cores into `ui`.

## Consequences

- Agents refuse new packages that do not meet promotion rules; refuse additive work in `@pakfactory/components`.
- Package moves are separate chores; this ADR documents taxonomy and the components retirement path.
- Aligns with Turborepo practice and ADR-013 without replacing app-level component folder rules (ADR-005 → 008 → 011).
