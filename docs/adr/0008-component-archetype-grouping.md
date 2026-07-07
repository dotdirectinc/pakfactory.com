# ADR-008: Component grouping by archetype/layer (supersedes ADR-005 grouping)

**Status:** Accepted (2026-06-12). **Supersedes ADR-005's grouping axis** (feature/domain → archetype/layer). Retains ADR-005's routing-only `app/`, naming rules (D5), and the `@pakfactory/ui` cross-app tier. **ADR-007 (inline single-route page views) remains in force.** Implemented in `apps/blog`; `apps/www` deferred.

> **Terminology:** Page-builder vocabulary is **"block"**, not "section" — see **[ADR-012](0012-page-block-terminology.md)** (supersedes the 2026-06-17 "section, not block" note). Folders: `components/blocks/` ⇄ Studio `schemas/blocks/`, `BlockRenderer`/`BLOCK_COMPONENTS`, Studio label "Page blocks". Sanity **content field names** (`pageBuilder`, member `_type`s) are unchanged — no content migration.

## Context

ADR-005 grouped `src/components/` by **feature/domain** (`post/ category/ tag/ author/ home/ …` + `common/`). As the blog moves to an editor-driven **page-builder homepage** (one Sanity `pageBuilder` array of page-builder blocks, each rendered by a matching React component), a different organizing axis became more useful in practice:

- The **page-builder blocks** are a first-class concept that must mirror the Studio [`schemas/blocks/`](../../apps/studio/schemas/blocks/) folder 1:1 (the `_type → component` resolver depends on this correspondence). They deserve a dedicated home, not dispersal across feature folders.
- The reference implementations we follow — **`robotostudio/turbo-start-sanity`** (`schemaTypes/blocks/` + `components/blocks/` on web) and **Sanity Ignite** (`sections/` + `templates/` + `modules/` + `ui/`) — use role-based folders for page-builder blocks, route templates, data-driven modules, and presentational primitives. We align Studio and web on **block** terminology (`schemas/blocks/` ↔ `components/blocks/`).
- Under feature/domain grouping, "what kind of thing is this component" (a builder block? a route template? site chrome? a filter control?) is invisible — that **architectural role** is what we now reason about most when wiring the builder.

## Decision

**`apps/blog/src/components/` is grouped by archetype/layer, not feature/domain.** Five folders:

| Folder | Holds | Examples |
|--------|-------|----------|
| `blocks/` | **Page-builder blocks** — one per Studio `schemas/blocks/` type; targets of the `_type → component` resolver (`BlockRenderer` + `BLOCK_COMPONENTS`). | `post-featured-row`, `post-category-row`, `post-spotlight-row`, `tag-strip`, `cta-newsletter`, `cta-rfq`, `cta-pillars`, `rich-text-band` |
| `layout/` | **Site chrome / page frame** — nav, footer, structural wrappers. | `site-nav`, `site-nav-categories`, `site-footer`, `footer-wordmark`, `breadcrumb`, `page-dieline-section` |
| `views/` | **Route-level templates** — multi-route whole-page views (per ADR-007, single-route views stay inlined in `page.tsx`). | `category-archive-view`, `all-archive-view`, `tag-archive-view`, `author-header`, `archive-layout`, `blog-landing-view` |
| `modules/` | **Sanity-data-driven reusable building blocks** — cards, lists, filters, forms, loaders. | `post-card`, `post-list`, `filter-sidebar`, `filter-active`, `filter-archive-sidebar`, `pagination`, `search-form`, `author-posts-loader`, `contribute-form` |
| `ui/` | **App-local presentational primitives** (not cross-app). Distinct from the `@pakfactory/ui` package. | `portable-text`, `category-chips` |

### Where does this file go? (ordered decision rule)

Answer these in order — first match wins:

1. Editor places it in the Sanity page builder? → **`blocks/`**
2. Site-wide chrome (nav / footer / page frame)? → **`layout/`**
3. Whole-page template a route renders, shared by 2+ routes? → **`views/`** (single-route view stays inline in `page.tsx` per ADR-007)
4. Fetches or receives Sanity data, or runs a server action? → **`modules/`**
5. Otherwise (presentational primitive, no data) → **`ui/`** (promote to `@pakfactory/ui` when a second app needs it)

No generic **`common/`** bucket — industry starters avoid a misc folder; role-based names keep placement obvious.

Rules retained from ADR-005 (unchanged):

- **`app/` is routing only.** No `_components/` folders; routes import from `@/components/<folder>/…`. `src/` stays `app/ components/ lib/`.
- **Naming (ADR-005 D5):** kebab-case files, **file name === exported component** (`post-card.tsx` ↔ `PostCard`). Never a registry/design-tool ID (`hero-section-32`). A block file is named for the **block stem** (`post-featured-row` → `PostFeaturedRow`), not a positional ID.
- **`@pakfactory/ui` is the cross-app primitive tier.** `components/ui/` is **app-local** only; promote a primitive to `@pakfactory/ui` when a second app needs it.
- **ADR-007 stands:** a whole-page view rendered by exactly one route is inlined in that route's `page.tsx`; a view shared by 2+ routes is a component in `views/`.

### Naming convention (prefix-first stem)

Within every folder, a file is named **`<domain/intent prefix>-<rest>`** so alphabetical sort clusters related files. `_type` (camelCase), file (kebab-case), and component (PascalCase) are mechanical transforms of the same stem.

**Recognized prefixes:** `post-` (post content), `cta-` (conversion blocks), `tag-` (tag navigation), `filter-` (faceting/filter controls), `search-` (search controls), `site-` (site chrome), `author-` (author components). A file with no natural domain (`pagination`, `breadcrumb`, `contribute-form`) keeps its plain archetype name rather than a forced prefix.

**Page-builder blocks** (in `blocks/`):

| `_type` | File | Component | Prefix |
| --- | --- | --- | --- |
| `postFeaturedRow` | `post-featured-row` | `PostFeaturedRow` | `post` |
| `postCategoryRow` | `post-category-row` | `PostCategoryRow` | `post` |
| `postSpotlightRow` | `post-spotlight-row` | `PostSpotlightRow` | `post` |
| `tagStrip` | `tag-strip` | `TagStrip` | `tag` |
| `ctaNewsletter` | `cta-newsletter` | `CtaNewsletter` | `cta` |
| `ctaRfq` | `cta-rfq` | `CtaRfq` | `cta` |
| `ctaPillars` | `cta-pillars` | `CtaPillars` | `cta` |
| `richTextBand` | `rich-text-band` | `RichTextBand` | — |

**Filter cluster** (in `modules/`): all faceting controls use the `filter-` prefix — `filter-sidebar`, `filter-active`, `filter-archive-sidebar`.

Prefixes group intent (`post` = post-driven rows, `cta` = conversion blocks, `tag` = tag navigation, `filter` = archive faceting). Adding a page-builder block requires Studio schema in `schemas/blocks/` + component in `components/blocks/` + `registry.ts` entry + GROQ branch in the page-builder query.

### Naming collision note

`components/ui/` (app-local primitives) is intentionally distinct from the **`@pakfactory/ui`** package (cross-app primitives). Import paths disambiguate: `@/components/ui/*` vs `@pakfactory/ui/components/*`.

## Why archetype over feature/domain (the trade-off)

ADR-005 chose feature/domain on the "screaming architecture" argument (UI should shout what it does for the product). We are overriding that **specifically because the page-builder makes architectural role the dominant axis**: the build wires blocks → `BlockRenderer` → chrome, and grouping by role keeps `blocks/` aligned with Studio `schemas/blocks/` and keeps page-builder blocks from scattering. The accepted cost: a single feature's pieces (e.g. everything "tag") are now spread across `blocks/`, `views/`, `modules/`, and `ui/` rather than co-located in `tag/`. For a CMS-page-builder app this is the better trade; for a non-CMS app it may not be, so **scope is `apps/blog` only** and `apps/www` is free to choose its own axis when remediated.

## Scope

`apps/blog/src/components/` only. `packages/ui` unchanged. `apps/www` deferred — it is not page-builder-shaped and adopts its own grouping when scheduled.

## Consequences

- `blocks/` mirrors [`apps/studio/schemas/blocks/`](../../apps/studio/schemas/blocks/) 1:1. Adding a page-builder block: Studio schema in `schemas/blocks/` + component in `components/blocks/` + `registry.ts` + GROQ branch.
- Studio field labels use **Page blocks**; Sanity content field names (`pageBuilder`, block `_type`s) stay stable — no content migration.
- "Where does this file go?" is answered by the **ordered decision rule** above.
- A feature's components are no longer co-located (trade-off accepted).
- ADR-005's feature/domain `common/` model is **superseded for `apps/blog`**; `common/` no longer exists there.
- ADR-005 remains the historical record and still governs `apps/www` until that app is remediated.
