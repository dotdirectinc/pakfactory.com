# PROD-2193 — RSS autodiscovery `<link>` on blog templates

Component: **Blog** · Epic: PROD-2180 (Platform: Technical SEO & Site Health)

## Summary

The blog RSS feed at `https://pakfactory.com/blog/rss.xml` is live and valid, but the
blog pages weren't reliably advertising it. A root-layout `alternates.types` entry
_existed_ but was **silently dropped on the exact pages the ticket names** (post,
category, author, home) and emitted a **relative** href. This ticket makes the
autodiscovery `<link rel="alternate" type="application/rss+xml">` render in `<head>` on
**every** blog route with an **absolute** href.

## What changed

| File | Change |
|------|--------|
| `apps/blog/src/app/layout.tsx` | Removed the `metadata.alternates.types` RSS entry (the broken path); render the RSS `<link>` directly in the layout JSX instead, with `href={absoluteUrl('/rss.xml')}`. Swapped the `sitePath` import for `absoluteUrl`. |

Single-file change. No schema, no package, no route changes.

## Root cause — why the pre-existing metadata entry failed both ACs

The layout previously declared the feed via the Next.js Metadata API:

```ts
// layout.tsx (before)
export const metadata = {
  alternates: { types: { 'application/rss+xml': [{ url: sitePath('/rss.xml'), title: 'PakFactory Blog' }] } },
};
```

Two defects:

1. **Dropped on doc pages (AC #1 fail).** Post, category, author, and home all build
   metadata through `buildDocMetadata` (`src/lib/resolve-seo.ts`), which returns
   `alternates: { canonical }`. **Next.js overrides metadata per top-level key across
   the segment chain — `alternates` is replaced wholesale, not deep-merged** — so
   `{ canonical }` overwrote the layout's `{ types: {rss} }`. The feed `<link>`
   survived only on routes that set no `alternates` of their own (search, topics,
   not-found).
2. **Not absolute (AC #3 fail).** `sitePath('/rss.xml')` is root-relative and
   `metadataBase` is **unset** anywhere in the app, so Next resolves it against its
   default (`http://localhost:3000` + a build warning) rather than the production
   origin.

## Key design decisions

- **Render a real `<link>`, not Metadata API `alternates`.** React (19) / Next App
  Router hoist a `<link>` rendered anywhere in the tree into `<head>` on every route.
  Because it's a rendered element — not part of the per-page `Metadata` object — it is
  **structurally immune** to the shallow `alternates` override that caused the bug. Any
  future page can set its own `alternates: { canonical }` without ever dropping the
  feed link again. This also matches the existing `apps/blog/CLAUDE.md` note that the
  feed "is linked from `layout.tsx` as `rel="alternate"`".
- **`absoluteUrl('/rss.xml')`, not `sitePath`.** `absoluteUrl` = origin
  (`NEXT_PUBLIC_SITE_URL`) + `BLOG_BASE_PATH` + path, producing a full URL independent
  of `metadataBase`. In production (`NEXT_PUBLIC_SITE_URL=https://pakfactory.com`,
  `NEXT_PUBLIC_BLOG_BASE_PATH=/blog`) it resolves to exactly
  `https://pakfactory.com/blog/rss.xml`. The layout is a server component, so this is
  resolved server-side — no client-bundle inlining concern (unlike PROD-1596).
- **Removed the metadata entry to avoid duplicates.** Keeping both the rendered `<link>`
  and `metadata.alternates.types` would emit two identical tags on the routes that
  don't override `alternates`.

## Acceptance criteria — mapping

| AC | Met by |
|----|--------|
| `view-source` on `/blog` and a blog post shows the `alternate` RSS `<link>` in `<head>` | Rendered `<link>` in `layout.tsx`, hoisted to `<head>` on all routes |
| A feed reader / browser extension auto-detects the feed | Standard `rel="alternate" type="application/rss+xml"` in `<head>` |
| `href` is absolute → `https://pakfactory.com/blog/rss.xml` | `absoluteUrl('/rss.xml')` with prod env |

## Verification

- `pnpm --filter @pakfactory/blog typecheck` — clean.
- `eslint src/app/layout.tsx` — clean.
- Manual: `view-source` on `/`, a post, `/[category]`, `/author/[slug]` → each `<head>`
  carries exactly one RSS `<link>`; confirm no duplicate on `/search` and `/topics`.
- Confirm the prod Vercel blog project resolves `NEXT_PUBLIC_SITE_URL` →
  `https://pakfactory.com` and `NEXT_PUBLIC_BLOG_BASE_PATH` → `/blog` so the href is the
  absolute prod URL.
