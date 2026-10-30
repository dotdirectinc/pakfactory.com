# CLAUDE.md — `@pakfactory/seo`

Inherits [`AGENTS.md`](../../AGENTS.md). This package is the **only** place for schema.org JSON-LD object builders (Jira **PROD-1487**).

## Rules

- **No runtime dependencies** — plain TypeScript objects + `serializeJsonLd` / `jsonLdGraph`.
- **Apps consume** via `workspace:*` and `transpilePackages` in Next config; do not copy generators into `apps/*`.
- **Generators:** `organization`, `person`, `profilePage`, `article`, `blog`, `blogPosting`, `newsArticle`, `breadcrumbList`, `collectionPage`, `itemList`, `webPage`, `videoObject`, `faqPage`, `product`, `service`, `definedTerm`, `definedTermSet`.
- **Embedding:** apps call `serializeJsonLd(jsonLdGraph([...nodes]))` in a server component `<script type="application/ld+json">`.
- **URLs:** callers pass **absolute** canonical URLs (from `getSiteUrl()` on the blog app).
- **Extend here first** when adding new schema types; then wire the app route.
- **Omit, never empty.** A property with no value is left out — never `"alternateName": []`. `faqPage` is the reference shape: filter first, then decide whether the node has anything to say.
- 🔴 **`product` emits no `offers`, `review` or `aggregateRating`**, so product pages are *not* eligible for Google's Product rich result. PakFactory quotes against an MOQ and has no list price; inventing one would be a false public claim (`Sanity/SEO Model.md` §6, Decisions D82). Do not "fix" this by adding an offer.

> ⚠️ **That list has gone stale three times.** `faqPage` shipped while this file, `docs/blog-jsonld-audit.md` and `.claude/skills/seo-structured-data/SKILL.md` all still called it missing or pending — and all three also name a `howTo` generator that does not exist and whose rich results Google dropped in 2023. **A list nothing executes rots.** The source of truth is `src/index.ts`; the line above is a convenience, and it is updated in the same commit that adds a generator.

## Consumers

| App         | Usage                                                                    |
| ----------- | ------------------------------------------------------------------------ |
| `apps/blog` | Post detail `@graph` (BlogPosting, Organization, Person, BreadcrumbList) |
| `apps/www`  | Case studies (`Article`, Organization, CollectionPage, ItemList, VideoObject) · PDP (`Product`, BreadcrumbList, FAQPage) · Expertise stage (`Service`, BreadcrumbList, FAQPage) · Newsroom (NewsArticle, Organization, BreadcrumbList, ItemList) |

## Not wired to anything yet

`definedTerm` and `definedTermSet` exist but nothing calls them: `/glossary` does not exist in `apps/www` (**PROD-3219**) and the index is **PROD-1826**. They ship ahead of their pages deliberately — pure functions cost nothing to have ready and are tested without a route.
