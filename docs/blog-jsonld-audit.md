# Blog JSON-LD / AEO audit

Last updated: 2026-06-18.

**Binding rule:** all schema.org objects come from [`@pakfactory/seo`](../packages/seo) via `serializeJsonLd(jsonLdGraph([...]))` — never hand-author `{ "@type": ... }` in route files. See [`packages/seo/CLAUDE.md`](../packages/seo/CLAUDE.md) and the in-repo `seo-structured-data` skill.

**Related:** [`apps/blog/memory.md`](../apps/blog/memory.md) (SEO wiring backlog, preview audit) · [`docs/blog-content-spec-gap-analysis.md`](./blog-content-spec-gap-analysis.md) · PROD-1502 (post page rebuild).

---

## Google SERP vs AEO — why two tiers exist

Google Search and answer engines (ChatGPT, Perplexity, Google AI Overviews) use structured data differently in 2026:

- **Google Search** cares about `BlogPosting`, `BreadcrumbList`, `Organization`, and listing types for editorial understanding and SERP enhancements. Google has **no strictly required** JSON-LD properties for Article/BlogPosting — but recommends as many applicable properties as possible ([Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)).
- **FAQPage / HowTo rich results in Google Search are deprecated** (FAQ removed May 2026; [changelog](https://developers.google.com/search/docs/appearance/structured-data/faqpage)). Do not scope PROD-1502 around chasing FAQ accordions in Google SERP.
- **AEO/GEO** still benefits from visible FAQ blocks + matching `FAQPage` JSON-LD, TL;DR summaries, and dense `@graph` entity linking — for AI citation and extraction, not Google rich-result eligibility.

PakFactory priorities below are split into **Tier 1 (Google baseline)**, **Tier 2 (deprecated SERP — do not chase)**, and **Tier 3 (AEO/GEO)**.

---

## Tier 1 — Google Search baseline (implement / maintain)

| Type | Where | Google intent | PakFactory status |
| --- | --- | --- | --- |
| **`BlogPosting`** or **`NewsArticle`** | Post detail | Editorial understanding, Top Stories / News; use most specific subtype | **Partial** — `blogPosting` wired in [`blog-post.ts`](../apps/blog/src/lib/blog-post.ts); no `dateModified`; no `description` from TL;DR; `newsArticle` generator exists but unused for Packaging News |
| **`Organization`** | Every page `@graph` | Publisher entity; Article `publisher` references via `@id` | **Done** |
| **`Person`** | Post + author page | Author best practices: `name` + `url` (or `sameAs`) per author | **Done** — posts link to `/author/{slug}#person`; author page emits `Person` + `sameAs` |
| **`BreadcrumbList`** | Posts, archives, author | Hierarchy in SERP | **Done** |
| **`Blog`** | Home `/` | Blog entity with `publisher` | **Done** — [`page.tsx`](../apps/blog/src/app/page.tsx) |
| **`CollectionPage` + `ItemList`** | `/all`, `/{category}`, `/tag/{slug}` | Listing semantics | **Done** — archive JSON-LD builders |
| **`WebPage`** | CMS landing, `/contribute` | Non-article pages | **Partial** — landing view + contribute; home uses `Blog` not `WebPage` |

### Google-recommended `BlogPosting` properties

All recommended (none strictly required per Google):

- `headline`, `image` (crawlable absolute URL; multiple aspect ratios ideal)
- `datePublished`, `dateModified` (ISO 8601 with timezone)
- `author` — one `Person` or `Organization` per author with `name` + `url`/`sameAs`
- `publisher` — `Organization` with `name`; optional `logo` (generator supports `logo`; **not yet fed from settings**)

---

## Tier 2 — Deprecated or narrow Google rich results (do not chase SERP)

| Type | Google Search status | PakFactory stance |
| --- | --- | --- |
| **`FAQPage`** | Rich result deprecated May 2026; removed from Rich Results Test / Search Console FAQ report | Emit for **AEO** when FAQ UI is visible — Studio field description: "visible block + AI extraction", not Google accordion |
| **`HowTo`** | Rich result deprecated | Defer unless tutorial content model ships |

---

## Tier 3 — AEO/GEO extensions (not Google rich-result drivers)

| Signal | Mechanism | PakFactory status |
| --- | --- | --- |
| Answer-first summary | Visible TL;DR + `BlogPosting.description` | Schema `tldr` exists; **not projected, rendered, or in JSON-LD** |
| FAQ extraction | Visible FAQ + `FAQPage` in `@graph` | Schema `faqItems` exists; **no `@pakfactory/seo` generator, no UI** |
| Entity graph density | `@graph` with stable `@id` cross-refs | **Done** on post detail |
| Crawler policy | `aiTraining` / `aiAnswering` per post + site defaults; `llms.txt` / `robots.txt` | Schema + settings exist; **no blog routes serve these yet** — separate from JSON-LD |
| Citations / HowTo / speakable | Future content-model fields | PROD-1502 / content spec |

---

## Per-route coverage matrix

| Route / view | JSON-LD types emitted | Builder location |
| --- | --- | --- |
| `/` home | `Organization`, `Blog` | [`apps/blog/src/app/page.tsx`](../apps/blog/src/app/page.tsx) |
| `/{slug}` post (stub) | `Organization`, `Person`, `BlogPosting`, `BreadcrumbList` | [`apps/blog/src/lib/blog-post.ts`](../apps/blog/src/lib/blog-post.ts) |
| `/{category}` archive | `Organization`, `CollectionPage`, `BreadcrumbList`, `ItemList` | [`category-archive-jsonld.ts`](../apps/blog/src/lib/category-archive-jsonld.ts) |
| `/tag/{slug}` | same pattern | [`tag-archive-jsonld.ts`](../apps/blog/src/lib/tag-archive-jsonld.ts) |
| `/all` | same pattern | [`all-archive-jsonld.ts`](../apps/blog/src/lib/all-archive-jsonld.ts) |
| `/author/{slug}` | `Organization`, `Person`, `BreadcrumbList` | [`author-jsonld.ts`](../apps/blog/src/lib/author-jsonld.ts) |
| CMS landing (`blogPage`) | `WebPage` only | [`blog-landing-view.tsx`](../apps/blog/src/components/views/blog-landing-view.tsx) |
| `/contribute` | `WebPage`, `BreadcrumbList` | [`contribute/page.tsx`](../apps/blog/src/app/contribute/page.tsx) |
| `/search` | None | Always `noindex`; no JSON-LD today |

Shared archive chrome: [`archive-layout.tsx`](../apps/blog/src/components/views/archive-layout.tsx) injects a pre-serialized `jsonLd` string.

---

## `@pakfactory/seo` generators

**Shipped:** `organization`, `person`, `blogPosting`, `newsArticle`, `breadcrumbList`, `collectionPage`, `itemList`, `blog`, `webPage`.

**Missing (gap analysis + `seo-structured-data` skill):** `faqPage`, `howTo`.

Extend generators in `packages/seo` first; then wire app routes.

---

## Studio schema vs front-end (post AI fields)

Post schema ([`apps/studio/schemas/post.ts`](../apps/studio/schemas/post.ts)):

| Field | Studio | GROQ (`POST_BY_SLUG_QUERY`) | UI | JSON-LD / crawler |
| --- | --- | --- | --- | --- |
| `tldr` | Required PT | Not projected | Not rendered | Not in `BlogPosting.description` |
| `faqItems` | Optional Q&A | Not projected | Not rendered | No `faqPage` generator |
| `aiTraining` | Boolean | Not projected | Not used | No crawler signal |
| `aiAnswering` | Boolean | Not projected | Not used | No crawler signal |

Global defaults in [`settings.ts`](../apps/studio/schemas/settings.ts): `aiTrainingDefault`, `aiAnsweringDefault`, `llmsTxt` — not served by the blog app.

---

## Gap summary — priority order

| Gap | Tier | Ticket / backlog |
| --- | --- | --- |
| `dateModified` on posts | 1 | PROD-1502 + project `lastModified` in GROQ |
| `NewsArticle` for Packaging News category | 1 | PROD-1502 (`newsArticle` generator exists) |
| Publisher `logo` on `Organization` | 1 | Section C — wire `settings` org logo |
| TL;DR → `description` on `BlogPosting` | 3 (AEO) | PROD-1502 |
| `FAQPage` generator + visible FAQ | 3 (AEO) | PROD-1502 + new `@pakfactory/seo` generator |
| `aiTraining` / `aiAnswering` / `llms.txt` | 3 (crawler policy) | New routes + settings GROQ |

---

## What "AI JSON-LD" means in this codebase

1. **Structured extraction (AEO/GEO):** `FAQPage`, `HowTo`, `BlogPosting` with rich fields (`description` from TL;DR, future `speakable`, citations).
2. **Crawler policy (non-JSON-LD):** `aiTraining` / `aiAnswering` per post + site defaults → likely `robots.txt` / `llms.txt` routes from settings.
3. **Visible parity:** `FAQPage` JSON-LD must match rendered FAQ UI.

Implementation is **blocked on PROD-1502** (post page rebuild) and Section B of the SEO wiring backlog in [`apps/blog/memory.md`](../apps/blog/memory.md).

---

## Recommended sequencing

1. **PROD-1502 Tier 1** — `dateModified`, `NewsArticle` where applicable, publisher logo from settings.
2. **Section B** — SEO/Social metadata fallbacks (feeds OG/title into existing graphs).
3. **PROD-1502 Tier 3** — TL;DR UI + `description`; FAQ UI + `faqPage` generator; then crawler-policy routes for AI toggles.
