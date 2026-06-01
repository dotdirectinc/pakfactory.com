# Blog content-team spec — schema gap analysis (PROD-1502 prerequisites)

**Source:** [`docs/pakfactory-content-team-fields-final.md`](./pakfactory-content-team-fields-final.md) (content-team checklist of every field editors will see in Studio).

**Compared against:** the current Studio schemas in [`apps/studio/schemas/`](../apps/studio/schemas/) (`post`, `author`, `blogCategory`, `blogTag`, `contentWidget`, `widgetEmbed`, `bodyImage`, `settings`).

**Conclusion:** PROD-1502 (rebuild `/blog/{slug}` single post page) **cannot be rebuilt to spec** without first landing the schema fields the content team's checklist defines. The post-document rebuild is its own ticket — **[PROD-1490 — Rebuild post document type](https://dotdirect.atlassian.net/browse/PROD-1490)** (In Progress). Recommend completing PROD-1490 (+ the supporting schemas) before PROD-1502 so the page renders real fields instead of being half-built and reworked.

## What blocks PROD-1502 (must come from the post-document rebuild)

### Missing body widgets (`contentWidget` today only has `cta` + `product-card`)

Spec **Tier 1** — build for launch:

- [ ] **Comparison Table** — semantic HTML `<table>`, AI-crawlable *(maps to PROD-1502 AC "data tables")*
- [ ] **Stat Callout** — emphasized stat with required source *(high AEO value)*
- [ ] **Data Visualization** — chart + always-present HTML `<table>` of underlying data *(spec lives in a missing `pakfactory-data-visualization-spec.md`)*
- [ ] **Callout / info box** — "Pro tip", "Did you know?"
- [ ] **Pull quote** block w/ optional attribution *(maps to PROD-1502 AC "pull quotes")*
- [ ] **Embed** — YouTube, Vimeo, X post, Instagram by URL
- [ ] **Internal link card** — visual link to a related post

Already present: **Product reference** (✅ `product-card` widget), **CTA box** (✅ `cta` widget).

### Missing post fields

- [ ] **FAQ section** — Q/A array → `FAQPage` *(maps to PROD-1502 AC "FAQ accordion")*
- [ ] **TL;DR / Key takeaways** — rich text, renders at top + injected into JSON-LD
- [ ] **Citations / sources** — array of references → visible footnotes + citation schema
- [ ] **HowTo steps** — optional tutorial structure → `HowTo` schema
- [ ] **Speakable selectors** — voice-assistant readouts (advanced)
- [ ] **`relatedPosts`** — manual reference array (3–5), fallback to category-based suggestions. Today only `relatedCapabilities` + `relatedProducts` exist (no post→post field).
- [ ] **Featured image alt** — spec says *required*; `mainImage` currently has no alt
- [ ] **Body text link rel** — `nofollow` / `sponsored` / `ugc` on text links (only image links have `linkNofollow` today)
- [ ] **Last modified** — editable override (today: only system `_updatedAt`)
- [ ] **Code blocks** — not in body schema (spec calls it "rarely needed")
- [ ] **SEO toggles**: `canonicalUrl`, `noindex`, `nofollow`, `noimageindex`
- [ ] **AI toggles**: `aiTraining`, `aiAnswering`
- [ ] **Social**: `ogTitle`, `ogDescription` (only `ogImage` exists)

### Missing `@pakfactory/seo` generators

- [ ] `faqPage` (for FAQ section)
- [ ] `howTo` (for HowTo steps)
- ✅ `newsArticle` already exists (for Packaging News posts)

### Buildable *today* without schema work (so PROD-1502 isn't blocked end-to-end)

Header (breadcrumb, category badge, H1, byline + date + **read time**, hero image), **ToC from H2/H3**, share buttons, **RFQ CTA card**, body rendering for the *existing* block / `bodyImage` / CTA / product-card, **tag rail → `/tag/{slug}`**, **author bio**, **3 related posts** (category fallback), **`BlogPosting` / `NewsArticle` + `BreadcrumbList`**, full OG/Twitter (image only), reserved-slug 404.

## Other docs — gaps (out of PROD-1502, but cleaning the whole blog)

| Doc | Missing vs spec |
|---|---|
| **`author`** | short-bio vs long-bio split; **social profiles array** (multi-`sameAs`); author SEO fields (meta title/description, OG image, `index`/`follow`/`active` toggles). *Affects PROD-1501 — currently single `bio` + LinkedIn-only.* |
| **`blogCategory`** | banner / featured image; `ogTitle` / `ogDescription`; `index`/`follow`/`no-image-index` toggles; `canonicalUrl`; icon / display order / color |
| **`blogTag`** | `index` / `follow` toggles; **default `noindex`** (see conflict below); site-settings auto-noindex threshold |
| **`settings`** | virtually everything: org details (legal name, logo, founding date, contact), default robots directive, GTM, Search Console / Bing verification, **IndexNow** API key, **editable `robots.txt`**, **editable `llms.txt`**, auto-noindex threshold, default title templates per doc type, global AI training/answering defaults |
| **`redirect`** | **Document type doesn't exist.** Redirects live in `next.config.ts` today (PROD-1597). Spec wants a `redirect` doc: `From URL`, `To URL`, `Type` (301/302), `Notes`, `Active`. |
| **Image asset** | asset-level **required alt** (spec wants alt enforced on the asset, not per-use) |

## ⚠️ Conflicts with already-shipped work

1. **Tag indexing.** Spec: tags default **`noindex`**, flip on for ≥5–10 posts; Site Settings has an auto-noindex threshold (default 3). Shipped: **PROD-1500** makes tag page-1 indexable when ≥1 post (and `noindex` only when empty). **Reconcile** — likely flip the default and add the threshold from Site Settings.
2. **Author social profiles.** Spec: array of social URLs → multiple `sameAs`; shipped **PROD-1501** renders LinkedIn-only and emits `sameAs: [linkedIn]`. Will need a refactor when the `socialProfiles` array lands.

## ⚠️ Missing reference docs in `docs/`

The content-team checklist references these — none are committed yet:

- `pakfactory-seo-checklist.md`
- `pakfactory-structured-data-spec.md`
- `pakfactory-data-visualization-spec.md`
- `pakfactory-redirect-management-spec.md`

Ask the content team to share these before scoping PROD-1490 in detail.

## Recommended sequencing

1. **PROD-1490** — rebuild `post` document type with the fields above (FAQ, TL;DR, citations, HowTo, relatedPosts, lastModified, SEO/AI toggles, social title/desc, featured-image alt, body link rel) + extend `contentWidget` for the Tier-1 widgets (Comparison Table, Stat Callout, Pull Quote, Callout, Embed, Internal link card, Data Viz).
2. **`@pakfactory/seo`** — add `faqPage` + `howTo` generators (per `packages/seo/CLAUDE.md` "extend here first").
3. **PROD-1492** — wire GROQ expansions for the new widgets + fields.
4. **PROD-1502** — render the page against the now-real schema.
5. Side fixes: reconcile tag indexing conflict (PROD-1500); broaden author `sameAs` (PROD-1501); add the remaining doc types (`redirect`); rebuild Site Settings.

## Status

PROD-1502 is **In Progress** but effectively blocked. A summary of this analysis has been posted as a comment on the ticket; recommend transitioning to Blocked / back to Backlog until PROD-1490 lands.
