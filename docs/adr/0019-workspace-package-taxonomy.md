# ADR-019: Workspace package taxonomy

**Status:** Accepted (2026-09-19). **Applies to:** `all`. Complements [ADR-006](0006-design-system-and-tokens.md) (tokens in `@pakfactory/ui`) and [ADR-013](0013-shared-core-vs-feature-composition.md) (shared core vs feature composition). Does not invent a novel layout — adopts **Turborepo apps/packages** plus **platform vs product** packaging used across industry monorepos.

## Context

The monorepo grew many `packages/*` entries. Agents and humans need a stable answer to: *where does new shared code go?* Without a role model, we risk a second design system vs `@pakfactory/ui`, feature packages without a second consumer, and one-off “utils” packages that never earn their folder.

Industry default for this stack (Turborepo / Vercel-style): **`apps/` = deployables**, **`packages/` = shared libraries**, extracted when a **second app** needs the code or the code is clearly platform (design system, CMS SDK, SEO generators, auth client).

## Decision

### 1. Classify every workspace package by role

| Role | Meaning | Packages today |
| --- | --- | --- |
| **Platform** | Slow-changing foundations consumed by many apps | `ui`, `sanity`, `utilities`, `seo`, `supabase` |
| **Domain** | Business types/rules without React | `request` (RFQ/shipping/account types + `@pakfactory/request/geo`) |
| **Infra / web ops** | Shared technical SDKs with tests | `redirects`, `sitemap` |
| **Feature** | Multi-app product UI / composed shells | `features/auth-ui`, `features/brief-builder-ui` |

Human index: [`packages/README.md`](../../packages/README.md). Agent front door: [`AGENTS.md`](../../AGENTS.md) § Workspace packages.

### 2. Promotion rules (binding)

1. **Default to the owning app** (`apps/www`, `apps/blog`, `apps/admin`, `apps/studio`).
2. **Extract to `packages/`** only when a **second app** imports it, or it is clearly platform (tokens, Sanity queries/helpers, SEO generators, auth client/session).
3. **One design system:** primitives and tokens live in `@pakfactory/ui` (ADR-006 / ADR-013). Do **not** grow a second design-system package.
4. **Feature packages** (`*-ui`, composed chrome) are allowed only for genuine multi-app composition. Prefer promoting props-only bits into `@pakfactory/ui` over adding new feature packages.
5. Do **not** invent alternate taxonomies per ticket. Change this ADR via a superseding ADR if the model must change.

### 3. `@pakfactory/components` — retired

`@pakfactory/components` was a **feature** package shared by www + blog that overlapped `@pakfactory/ui`. It has been **retired**. Former clusters now live as:

| Former cluster | Now lives in |
| --- | --- |
| Breadcrumb trail | `@pakfactory/ui` (`breadcrumb-trail`) |
| Pagination + path/window helpers | `@pakfactory/ui` (components + `lib/pagination`) |
| Gallery slider | `@pakfactory/ui` |
| Watermark (React + pure geometry/variant) | `@pakfactory/ui` (components + `lib/watermark`) |
| Site nav / footer chrome | `@pakfactory/ui` `SiteNav` / `SiteFooter` (www wires request slot + primary-nav types locally) |
| `external-link` helper | `@pakfactory/utilities` |

Do **not** recreate `@pakfactory/components`. New shared UI goes in `@pakfactory/ui` (or app composition). General pure helpers (length units, dimension axes, external-link) go in `@pakfactory/utilities` — not pagination/watermark (those stay with `ui`).

### 4. `@pakfactory/geo` — folded into `request`

Country/region list helpers lived in `@pakfactory/geo` and are now exported as `@pakfactory/request/geo` (shipping / address / request location). Do **not** recreate `@pakfactory/geo`.

`@pakfactory/domain` was renamed to `@pakfactory/request` (same Domain role; clearer package name). Do **not** recreate `@pakfactory/domain`.

### 5. Feature packages — under `packages/features/`

`auth-ui` and `brief-builder-ui` are the correct home for multi-app product shells (www + admin). They live under **`packages/features/*`** (grouping folder only — package names stay `@pakfactory/auth-ui` / `@pakfactory/brief-builder-ui`). Do **not** merge them wholesale into `@pakfactory/ui`. Promote only true design-system primitives into `ui` when they lose product-specific copy/wiring.

### 6. Layout

Package roles live in docs. Most packages stay **flat** under `packages/*`. The only role grouping folder is **`packages/features/`** for Feature `*-ui` packages. Do not nest platform / domain / infra under role parents (`platform/`, `domain/`, …).

## Consequences

- Agents refuse new packages that do not meet promotion rules; refuse recreating a second design-system package, a one-off `geo` package, or `@pakfactory/domain` (use `@pakfactory/request`).
- Aligns with Turborepo practice and ADR-013 without replacing app-level component folder rules (ADR-005 → 008 → 011).
