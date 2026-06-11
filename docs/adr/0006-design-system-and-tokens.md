# ADR-006: Design system & tokens — shared dieline system in `@pakfactory/ui`

**Status:** Accepted (2026-06-10). Implemented in `@pakfactory/ui/globals.css` + `apps/blog`.

## Context

The blog needed a real visual foundation — the "dieline" layout system, typography, and brand tokens prototyped in `pakfactory.com-poc`. A standing guardrail (workspace rules / `apps/blog/CLAUDE.md`) says **not** to add new tokens or `@theme` blocks to `globals.css` "for features." Carrying the POC design system over is not a feature tweak — it is establishing the shared token layer itself, so the relationship between that guardrail and this change needs to be stated explicitly, or a future contributor (human or AI) will try to revert it.

## Decision

**The design system lives in `@pakfactory/ui/globals.css` as the single shared source of truth**, and every app imports it. Ported from the POC:

- **Layout:** `--layout-max: 1536px` (the dieline content column) and the dashed `border-x` "dieline" guides. The `PageDielineSection` layout primitive consumes `var(--layout-max)`.
- **Typography:** the Geist font stack — `--font-geist-sans` / `--font-sans`, plus serif and mono. `GeistSans.variable` is wired on `<html>` in `apps/blog/src/app/layout.tsx`.
- **Brand:** background/foreground, radius (`--radius: 0.625rem`), and the derived `--color-*` / `--radius-*` scales.

An app's own `globals.css` (e.g. `apps/blog/src/app/globals.css`) is just `@import "@pakfactory/ui/globals.css";` — apps do not define their own tokens.

**Reconciling with the "don't touch globals" guardrail:** the rule still holds for **feature work** — building a feature must not add one-off tokens or `@theme` tweaks; use the existing tokens + `className`. What changed is that **evolving the design system itself** (the shared token layer in `@pakfactory/ui/globals.css`) is a deliberate, reviewed act governed by this ADR, not a drive-by. Token changes are design-system decisions, not feature styling.

## Consequences

- `apps/www` inherits the same tokens automatically when it consumes `@pakfactory/ui/globals.css`, keeping blog and marketing visually consistent.
- The `PageDielineSection` primitive currently lives in `apps/blog/src/components/common/`; promote it to `@pakfactory/ui` when `www` adopts the dieline layout (Tier 3 per [ADR-005](0005-component-organization.md)).
- New shared deps introduced: `geist`, `lucide-react`.
- Future visual changes go through the token layer here, not per-app overrides.
