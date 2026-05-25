# CLAUDE.md — `@pakfactory/seo`

Inherits [`AGENTS.md`](../../AGENTS.md). This package is the **only** place for schema.org JSON-LD object builders (Jira **PROD-1487**).

## Rules

- **No runtime dependencies** — plain TypeScript objects + `serializeJsonLd` / `jsonLdGraph`.
- **Apps consume** via `workspace:*` and `transpilePackages` in Next config; do not copy generators into `apps/*`.
- **Generators:** `organization`, `person`, `blogPosting`, `newsArticle`, `breadcrumbList`, `collectionPage`.
- **Embedding:** apps call `serializeJsonLd(jsonLdGraph([...nodes]))` in a server component `<script type="application/ld+json">`.
- **URLs:** callers pass **absolute** canonical URLs (from `getSiteUrl()` on the blog app).
- **Extend here first** when adding new schema types (e.g. `FAQPage`); then wire the app route.

## Consumers

| App | Usage |
|-----|--------|
| `apps/blog` | Post detail `@graph` (BlogPosting, Organization, Person, BreadcrumbList) |
| `apps/www` | Future marketing schema — import from this package, do not duplicate |
