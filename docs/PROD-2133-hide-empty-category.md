# PROD-2133 — Auto no-index for empty categories

Component: **Blog** · Epic: PROD-2180 (Platform: Technical SEO & Site Health)

## Summary

Category archives with **zero published posts** are now automatically forced
`noindex` and dropped from the categories sitemap — no manual per-category SEO
work. Governed by a new **"Hide empty categories"** toggle (default **on**) in
Studio → **Category Settings**. Topics already had the equivalent auto-noindex
(an N-post threshold); this ports the idea to categories, keyed on **emptiness
(0 posts) only** per product decision.

## Scope decision (locked with Richard)

- **Category = empty only.** noindex iff `postCount === 0`. NOT the `< 5`
  threshold used for topics. A category with 1+ posts follows the normal listing
  rules.
- **Topic behaviour unchanged** — the existing `autoNoindexThreshold` (`< 5`) on
  `topicSettings` is untouched.
- **The toggle overrides a category's own `allowIndex`.** An empty category is
  `noindex` even if its "Allow indexing" is on (RankMath-style global override).
- **Sitemap kept in sync** in this ticket (not deferred).

## What changed

| File | Change |
|------|--------|
| `apps/studio/schemas/blogTypeSettings.ts` | `categorySettings`: new boolean `hideEmptyCategory` (default `true`) via the `extra` slot, mirroring `topicSettings.autoNoindexThreshold`. |
| `packages/sanity/src/queries/blog.ts` | `BLOG_SETTINGS_QUERY`: project `hideEmptyCategory` on the `categoryDefaults` line. `CATEGORIES_FOR_SITEMAP_QUERY`: add `allowIndex` + `postCount` (count of all published posts in the category, featured included). |
| `apps/blog/src/lib/blog-settings.ts` | `BlogTypeDefaults.hideEmptyCategory?: boolean \| null`. |
| `apps/blog/src/lib/seo.ts` | New pure predicate `isCategoryHiddenAsEmpty(postCount, hideEmptyCategory)` — the single source of truth for the rule (default on). |
| `apps/blog/src/lib/blog-category-archive.ts` | `getCategoryListingRobots` gains `{ postCount, hideEmptyCategory }`; forces `{index:false}` when empty-hidden. |
| `apps/blog/src/app/[category]/page.tsx` | Page-1 metadata passes `postCount` + the toggle. |
| `apps/blog/src/app/(sitemaps)/categories-sitemap.xml/route.ts` | Moved off the generic `makeTaxonomySitemap` factory to a bespoke handler that filters with the SAME `isCategoryHiddenAsEmpty` rule (+ `allowIndex != false`). |
| `apps/blog/CLAUDE.md` | Routes-table note for the now-gated categories sitemap. |

## Key design decisions

- **One predicate, two consumers — no drift.** `isCategoryHiddenAsEmpty` backs
  both the page meta-robots and the sitemap filter. The topics-sitemap handler
  documents a real prior bug from duplicating a rule in GROQ + code; this avoids
  it by construction.
- **The override is free.** `resolveDocRobots` computes
  `index: base.index && seo.allowIndex !== false` (AND). Forcing the base to
  `index:false` for an empty category therefore wins over any `allowIndex:true` —
  no special-casing needed. This is exactly requirement #3.
- **`postCount` must include featured posts.** On page 1 the archive's
  `totalCount` runs with `excludeFeatured`, so a category with only featured
  posts would read as `totalCount === 0`. The route uses
  `totalCount + featuredPosts.length` for a true 0-vs-more test; the sitemap GROQ
  counts all published posts via the reference. Both agree on the zero test.
- **Default-on, config-tunable.** `hideEmptyCategory ?? true` — the auto-noindex
  works from the default even before the Studio field is saved; editors can turn
  it off to let empty categories index again.
- **Paginated routes skip the rule.** `/[category]/page/[n]` only serves `n ≥ 2`,
  which requires `> perPage` posts, so it is never empty — callers there omit
  `postCount` and the rule is a no-op.

## Acceptance criteria — mapping

| AC | Met by |
|----|--------|
| Auto-noindex categories with too few posts (empty) | `isCategoryHiddenAsEmpty` → `getCategoryListingRobots` forces noindex at `postCount === 0` |
| Topics auto-noindex | pre-existing `autoNoindexThreshold` (unchanged) |
| Independent per-type config in Sanity | `categorySettings.hideEmptyCategory` (boolean) separate from `topicSettings.autoNoindexThreshold` (number) |

## Verification

- Typecheck: `@pakfactory/blog`, `@pakfactory/sanity` — clean. Studio schema lints
  clean (Studio has no `tsc` gate; its pre-existing `structure/index.ts` icon-type
  errors are unrelated).
- Live GROQ probe (read-only) confirmed `postCount` per category
  (branding-presentation 50, compliance-and-regulated 4, sustainability 27, …).
- Dev server (`BLOG_DISABLE_INDEXING` off): empty fallback categories
  (`/trends`, `/business-strategy`, `/design-inspiration`, `/packaging-news`) →
  `noindex, follow`; real categories → `index, follow`; `categories-sitemap.xml`
  lists only the 6 non-empty categories.

## Deploy note

The `hideEmptyCategory` toggle requires a **Studio deploy** to appear for editors,
but the blog auto-noindex works immediately on the `?? true` default. Ships to
**staging** first — it flips currently-indexed empty categories to noindex (intended).
