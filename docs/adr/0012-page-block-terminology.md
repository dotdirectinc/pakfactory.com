# ADR-012: Page-builder terminology — "block", not "section"

**Status:** Accepted (2026-07-07). **Supersedes ADR-008's terminology note** (2026-06-17 "section, not block" reversal). ADR-008's archetype/layer grouping, folder roles, and naming rules remain in force; only the **page-builder vocabulary** changes.

## Context

ADR-008 adopted **"section"** for page-builder code and Studio labels to mirror the HTML `<section>` element and keep `components/sections/` aligned with `schemas/sections/`. In practice, editors and product refer to these as **blocks** (page-builder blocks), and the Studio field description already says "Page-builder blocks". The interim ADR-008 "block" naming was reversed once; product has now ratified **block** as the canonical editor and developer term for page-builder array members.

## Decision

Use **block** (not **section**) for the Sanity page-builder concept everywhere except persisted Sanity field/type names that would require a dataset migration.

| Layer | Term | Examples |
| ----- | ---- | -------- |
| Studio editor labels | **Page blocks** | Group tab "Page blocks"; field title "Page blocks" |
| Code folders | `components/blocks/`, `schemas/blocks/` | Mirrors Studio 1:1 |
| Resolver | `BlockRenderer`, `BLOCK_COMPONENTS`, `registry.ts` | `_type → component` map |
| Types | `PageBuilderBlock`, `PostFeaturedRowBlock`, … | Discriminated union in `registry.ts` |
| Studio preview | `BlockItemPreview` | Array-item preview component |

**Unchanged (no content migration):**

- Sanity content fields: `pageBuilder`, `pageBuilderLanding`
- Array type names: `pageBuilder`, `pageBuilderHome`, `pageBuilderLanding`
- Member `_type`s: `postFeaturedRow`, `tagStrip`, `ctaNewsletter`, …
- GROQ projection constant `PAGE_BUILDER_BLOCKS_PROJECTION` (already "blocks")

**Out of scope — unrelated "section" uses stay as-is:**

- Footer nav `footerNavigation.columns[].sections` (editorial link groups)
- Layout/post components: `page-dieline-section`, `post-faq-section`, `category-listing-section`
- `apps/www` hero/section components
- Raw `<section>` HTML elements

## Consequences

- `apps/blog/src/components/sections/` → `components/blocks/`; `SectionRenderer` → `BlockRenderer`.
- `apps/studio/schemas/sections/` → `schemas/blocks/`; `SectionItemPreview` → `BlockItemPreview`.
- ADR-008, ADR-009, ADR-011, blog rules, and `AGENTS.md` references updated to say **block** for page-builder.
- Adding a page-builder block still requires: Studio schema in `schemas/blocks/` + component in `components/blocks/` + `registry.ts` + GROQ branch in `PAGE_BUILDER_BLOCKS_PROJECTION`.
- Zero dataset migration; existing documents continue to work.

## Scope

Page-builder terminology in `apps/blog` and `apps/studio` (blog workspace). Does not rename `apps/www` or non-page-builder "section" identifiers.
