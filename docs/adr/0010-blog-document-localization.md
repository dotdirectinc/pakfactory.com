# ADR-010: Blog document localization (Studio-first)

**Status:** Accepted (2026-06-15). Document-level English + French for blog CMS types; public blog app serves English only until locale routes ship.

## Context

Product needs French blog content authored in Sanity alongside English. Field-level i18n on shared entities (authors) and singleton settings are deferred. The public Next.js blog must not accidentally surface French documents before `/fr/*` routing, `hreflang`, and per-locale sitemaps exist.

## Decision

| Choice | Value |
| ------ | ----- |
| Strategy | **Document-level** — one document per language, linked via `translation.metadata` (`@sanity/document-internationalization` v6) |
| Languages | **English** (base) + **French** |
| Schema types | `post`, `blogPage`, `blogCategory`, `blogTag` |
| Out of scope (phase 1) | `author`, `blogSettings`, `contentWidget` |
| Frontend | Studio + GROQ `language == $language` filters; `apps/blog` passes `DEFAULT_BLOG_LANGUAGE` (`en`) on every fetch |

### Studio

- Hidden read-only `language` field on each i18n type (set by the plugin).
- Slug uniqueness is **per type + language** (same slug allowed on EN/FR pairs).
- Homepage singleton: fixed ids `blogHomePage` (EN) and `blogHomePage-fr` (FR); structure lists both under **Pages → Homepage**.
- Translation document actions on blog + admin workspaces.

### Queries

- All blog GROQ filters on i18n types include `&& language == $language`.
- Home builder query targets `$homePageId` + `$language` (English `blogHomePage` for now).

### Migration

- `apps/studio/scripts/migrate-blog-i18n-en.mjs` backfills `language: "en"` and creates the French homepage shell.

## Consequences

- Editors use **Translations** in Studio to create French versions; publish independently.
- Public site remains English-only (`layout.tsx` `lang="en"`) until a follow-up phase adds locale segments.
- Existing datasets must run the migration before queries return content.

## Follow-up (not this ADR)

- Next.js `/fr/*` routes, `hreflang`, RSS/sitemap per locale
- `blogSettings` / `contentWidget` translations
- Field-level i18n on `author.bio` if needed
