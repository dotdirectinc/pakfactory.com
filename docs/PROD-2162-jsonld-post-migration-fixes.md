# PROD-2162 — Structured data (JSON-LD) post-migration fixes

Component: **Blog + Case Study + Website** · Relates to **PROD-2144** (the audit that
found these gaps) · Epic: Technical SEO & Site Health

## Summary

PROD-2144 audited live JSON-LD on every template and flagged four fixes. After
investigating where each template is actually served, the scope splits three ways.

## Disposition of the four fixes

| # | Pri | Fix | Disposition |
|---|-----|-----|-------------|
| 1 | Medium | Homepage — define canonical `Organization` at `@id …#organization` | **Deferred** — `pakfactory.com/` is served by **Magento** (`x-magento-tags`), not this stack. Confirmed with reporter: do it during the main-website migration to www. |
| 2 | Medium | Contact — emit `ContactPage` + Org `contactPoint` | **Deferred** — `pakfactory.com/contact` is also **Magento**. Same migration. |
| 3 | Med-low | FAQ posts — structured FAQ + `FAQPage` | **No code needed — content backfill.** Already implemented end-to-end (see below). |
| 4 | Low | Case study — add `author` to the Article | **Done here** (this PR). |

## #4 — Case study Article `author` (the code change)

`apps/www/src/lib/case-study-jsonld.ts`: added `author: { "@id": orgId }` to the
`article()` node. Case studies are authored by PakFactory itself (not a person), so the
Organization is the author — this clears the Rich Results "missing author" recommended
field. The `@id` matches the existing `publisher` `@id` and the `Organization` node
already in the same `@graph`, so it resolves internally (verified: `author` `@id` ===
`Organization` `@id`). The `article()` generator already supported `author`
(`packages/seo/src/generators/article-like.ts:24`) — no generator change.

## #3 — FAQ is already built (why it's backfill, not code)

The full chain already exists and works:
- `apps/studio/schemas/post.ts` — `faqItems[]` field (`question` + portable-text `answer`).
- `packages/sanity/src/queries/blog.ts` — projects `"answerText": pt::text(answer)`.
- `apps/blog/src/lib/blog-post.ts:295` — filters items with `question` + `answerText`,
  emits `faqPage({ items })`.
- `apps/blog/src/components/post/post-faq-section.tsx` — renders the visible FAQ.

So `/blog/raster-vs-vector` "shows an FAQ but emits no FAQPage" **only because that post's
FAQ was authored as body content, not in the `faqItems` field**. Remedy = editors populate
`faqItems` on affected posts (content task), not development.

## Cross-reference for the deferred work (#1)

When the homepage Organization is defined during the website migration, it must use the
**same `@id`** the blog and case-study graphs already reference —
`https://pakfactory.com#organization` (origin + `#organization`, no path segment) — so the
cross-page references resolve.

## Verification

- `@pakfactory/www` + `@pakfactory/seo` typecheck — clean.
- Dev server: `/case-studies/tilt-hydrometer` JSON-LD now emits `Article.author` +
  `Article.publisher` both `{ "@id": "https://pakfactory.com#organization" }`, resolving to
  the `Organization` node in the same `@graph`.
