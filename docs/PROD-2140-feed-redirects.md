# PROD-2140 — Blog RSS feed + legacy WordPress feed redirects

Component: **Blog** · Epic: PROD-2180 (Platform: Technical SEO & Site Health)

## Summary

The Sanity blog already **emits a valid RSS 2.0 feed** at `/rss.xml`
(`apps/blog/src/app/rss.xml/route.ts`, driven by `BLOG_RSS_POSTS_QUERY` +
`buildRssFeedXml`). This ticket adds the **legacy WordPress feed 301s** and a small
feed-validity polish.

## What changed

| File | Change |
|------|--------|
| `apps/blog/next.config.ts` | `redirects()`: `/feed` and `/:path*/feed` → `/rss.xml` with **`statusCode: 301`**, placed **above** the `/category/*` rules. |
| `apps/blog/src/lib/rss.ts` | Added `<atom:link rel="self">` (+ `xmlns:atom`) so the feed passes the strict W3C validator. |
| `packages/sanity/src/blog-reserved-slugs.ts` | Added `"feed"` so no post/page slug can shadow the path. |
| `apps/blog/CLAUDE.md` | Routes table row + `feed` in the reserved-segment list. |

## Key design decisions

- **One rule covers every WP feed.** Every WordPress feed URL ends in a `/feed`
  segment — main `/feed/`, `/comments/feed/`, and per-category/tag/author/post
  `.../feed/`. So `/:path*/feed` (plus a root `/feed`) 301s the whole family to
  `/rss.xml`. No need to enumerate legacy per-category feed URLs (the BA's flagged
  "missing info").
- **`statusCode: 301`, NOT `permanent: true`.** Next emits **308** for `permanent`,
  but the AC requires a literal **301** (the conventional WordPress-migration signal
  feed readers/crawlers expect). `statusCode: 301` emits a true 301 (verified on
  Next 16.2.4).
- **Ordering matters.** `next.config` redirects run in array order (first match wins)
  **and before `proxy.ts`**. The existing `/category/:category/:postSlug → /:postSlug`
  rule would otherwise swallow `/category/{c}/feed` → `/{feed}` → 404. The feed rules
  sit first, so `/category/{c}/feed` resolves to `/rss.xml` in a single hop.
- **`feed` reserved.** Prevents a future post/category slug `feed` from colliding with
  the redirect (defensive; the rule only matches an exact `feed` segment so real slugs
  like `feed-guide` are unaffected).

## Domain / host topology (verified live)

- **Prod feed URL:** `https://pakfactory.com/blog/rss.xml` (basePath `/blog` applied).
- **Root `pakfactory.com/feed/`** is served by **Magento nginx**, not the Next app
  (nginx only proxies `/blog*` to the Vercel origin). It already 301s to
  `/blog/rss.xml` via an nginx rule — see below.
- **Subdomain caveat:** `blog.pakfactory.com/*` is 301'd to `/blog` at the ALB
  **dropping the path**, so `blog.pakfactory.com/feed/` lands on the blog **home**,
  not the feed. If any legacy feeds were indexed on the subdomain, that needs a
  separate ALB rule (preserve path / feed-specific) — out of this repo.

### Magento nginx rule (already applied on the prod box)

In the `pakfactory.com` server block, above `location /`:

```nginx
# Legacy WordPress RSS feeds at the domain root → new blog feed (PROD-2140).
location ~ (^|/)feed/?$ {
    return 301 https://pakfactory.com/blog/rss.xml;
}
```

## Verification checklist (post-deploy)

Staging serves at origin root (no `/blog`); prod serves under `/blog`. On staging drop
the `/blog` prefix and use the staging host.

```bash
# Expect each: 301 -> <origin>/blog/rss.xml  (single hop)
for u in \
  /blog/feed/ /blog/feed /blog/comments/feed/ \
  /blog/category/packaging/feed/ /blog/tag/x/feed/ \
  /blog/author/y/feed/ /blog/some-old-post/feed/ ; do
  printf '%-42s ' "$u"
  curl -sS -o /dev/null -w "%{http_code} -> %{redirect_url}\n" "https://pakfactory.com$u"
done

# Over-match guard — must NOT redirect to the feed:
curl -sS -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://pakfactory.com/blog/feed-guide

# Root feed (Magento nginx): 301 -> /blog/rss.xml
curl -sS -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://pakfactory.com/feed/

# Feed is valid: 200 application/xml, contains <atom:link rel="self">
curl -sSI https://pakfactory.com/blog/rss.xml | grep -i "^HTTP\|content-type"
curl -sS   https://pakfactory.com/blog/rss.xml | grep -c 'rel="self"'
```

## Follow-ups

- [ ] Confirm which host legacy feeds were indexed on (root `pakfactory.com/feed/` vs
      `blog.pakfactory.com/feed/`). If the subdomain, add the ALB path-preserving rule.
- [ ] Post-deploy: run the checklist above on staging, then prod.
