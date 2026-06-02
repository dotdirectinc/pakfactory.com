---
name: seo-structured-data
description: >-
  Author and wire schema.org JSON-LD for the blog by extending @pakfactory/seo
  generators (never hand-writing schema objects in routes) and embedding them via
  serializeJsonLd(jsonLdGraph([...])) with absolute URLs. Use when a route needs
  new or corrected structured data — e.g. the pending FAQPage and HowTo generators
  for the single post page (PROD-1502), or BlogPosting/NewsArticle/BreadcrumbList
  on a new route. Complements on-page-seo-auditor (which audits) by producing.
---

# SEO structured data (JSON-LD)

The blog stream is built for **AEO/GEO** — accurate JSON-LD is a first-class deliverable,
not an afterthought. This skill is the **authoring** counterpart to `on-page-seo-auditor`.

## The one rule

**All schema.org objects come from `@pakfactory/seo`.** Never construct `{ "@type": ... }`
literals in an app route. See [`packages/seo/CLAUDE.md`](../../packages/seo/CLAUDE.md):
*"Extend here first when adding new schema types; then wire the app route."*

Existing generators: `organization`, `person`, `blogPosting`, `newsArticle`,
`breadcrumbList`, `collectionPage`, `itemList`, `blog`. Pending (per the content-spec gap
analysis): **`faqPage`**, **`howTo`**.

## Procedure

1. **Pick the type(s).** Post → `blogPosting` (or `newsArticle` for Packaging News) + `organization` + `person` + `breadcrumbList`; add `faqPage` when the post has a FAQ section; `howTo` for tutorial posts; archives → `collectionPage` / `itemList`.
2. **If the generator exists**, skip to step 4. **If not** (e.g. `faqPage`, `howTo`):
   - Add the input type to `packages/seo/src/types.ts` and export it from `src/index.ts`.
   - Add `packages/seo/src/generators/<type>.ts` — a pure function returning a plain `JsonLdDocument`, **no runtime deps**.
   - Export it from `src/index.ts` and document it in `packages/seo/CLAUDE.md` (generators list).
   - This is a **package change supporting the blog** → keep it in its own commit on `feature/blog` (or a `feature/pkg-seo-*` branch if www will share it). See `single-app-commits-and-branches.md`.
3. **Feed real data** from the GROQ projection — if the field isn't projected yet, that's the `schema-contract` chain; resolve it there first.
4. **Embed in the route** (Server Component) exactly once:
   ```tsx
   import { serializeJsonLd, jsonLdGraph, blogPosting, breadcrumbList /* ... */ } from "@pakfactory/seo";
   const ld = serializeJsonLd(jsonLdGraph([ blogPosting({...}), breadcrumbList({...}) ]));
   // <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
   ```
5. **URLs must be absolute** via `absoluteUrl()` from [`src/lib/site.ts`](../../apps/blog/src/lib/site.ts) — never hardcode `/blog`; the `@id`/`url` fields must survive the subpath flip (PROD-1596). Cross-link entities by `@id` (e.g. `Article.author` `@id` = the author page Person node, as PROD-1501 does).
6. **Pair `generateMetadata`**: full title/description + Open Graph (`og:type=article`, image) + Twitter card, aligned with the JSON-LD. See `apps/blog/CLAUDE.md` § AEO/GEO.
7. **Audit before done:** run `on-page-seo-auditor` on the route; validate the `@graph` parses and entity `@id`s resolve.

## Verify

```bash
pnpm --filter @pakfactory/blog typecheck && pnpm build:blog
# load the route on :3003, extract the ld+json block, confirm types + absolute @id/url,
# and that FAQPage/HowTo appear only when the post actually has that section.
```

## Gotchas

- One `<script type="application/ld+json">` per page holding a single `@graph` — don't scatter multiple blocks.
- `FAQPage` only when the page **visibly** renders the Q&A (Google requires visible parity); emit it from the same source the UI renders.
- Keep generators **pure and dependency-free** so they stay unit-testable (see `test-harness`).
