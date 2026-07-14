# Bug: GROQ shared projection references a param a consumer doesn't provide

**Status:** Fixed — `feature/ziming-blog-staging` @ `645805a` (2026-07-07)
**Symptom:** `queryParseError: param $monthStart referenced, but not provided` (HTTP 400) when resolving any `/{slug}` that falls through to the landing-page (`blogPage`) fetch — e.g. `/artificial-intelligence-packaging-design-test`.

## What happened

The shared page-builder projection `PAGE_BUILDER_BLOCKS_PROJECTION`
(`packages/sanity/src/queries/blog.ts`) is spread into **multiple** queries:

| Query | Fetch helper | Provides `$monthStart`? |
|-------|--------------|--------------------------|
| `BLOG_HOME_PAGE_BUILDER_QUERY` | `blogHomePageParams()` | ✅ |
| topics index | `blogTopicsPageParams()` | ✅ |
| `BLOG_PAGE_BY_SLUG_QUERY` (landing/static) | `fetchBlogPageBySlug` → `blogLanguageParams({ slug })` | ❌ **only `language` + `slug`** |

A **staging merge** added a `postPopularRow` section branch to that shared
projection, and that branch references **`$monthStart`**. The home/topics fetches
already passed `monthStart`; the landing page-by-slug fetch did not. So the query
referenced a param the caller never supplied → parse error.

The blog-page fetch has a `try/catch` that returns `null` (so the route still
served 200 by falling through category → blogPage → post), but the error logged on
every such request and the blogPage branch never resolved.

## Fix

Added `blogPageBySlugParams(slug)` in `apps/blog/src/lib/blog-language.ts`
(mirrors `blogHomePageParams`) that includes `monthStart`, and used it in
`fetchBlogPageBySlug`.

## Root cause & prevention (the reusable lesson)

**When you add a `$param`-referencing branch to a *shared* GROQ projection, every
query that spreads that projection must provide the param — and those queries
often live behind different fetch helpers.** GROQ fails hard at parse time if a
referenced param is missing (it does *not* error on unused/extra params, so
over-providing is safe).

This is a classic **merge-integration** trap: two branches touch the same shared
projection (here, one added `postPopularRow`, the other changed the language
filters), and no single diff shows that a *consumer* fetch is now missing a param.

**Prevention checklist when editing a shared projection:**
- `grep` for the projection name to find every consumer query.
- For any new `$param`, confirm each consumer's fetch helper supplies it.
- Prefer over-providing the param in a shared params helper over per-call gaps.
- After a merge that touches a shared projection, smoke-test each consumer route
  (home, topics, a landing/static page, a post).
