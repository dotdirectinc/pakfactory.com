# IndexNow: key file + publish ping (PROD-2172)

Notifies Bing/Yandex/etc. immediately on blog post and case-study publish/update/unpublish,
instead of waiting for a crawl. Related: PROD-2142 (Sitemap Verify, Fix, and Submit —
IndexNow is the faster, out-of-band complement to the sitemap; Google doesn't participate
in IndexNow, so the sitemap stays the Google-facing signal).

## Status

| Piece | Status |
|---|---|
| 1. Key verification file at `pakfactory.com/{key}.txt` | ✅ **Done** — static file + nginx `location =` block (manual, on the live box) |
| 2a. Shared `submitIndexNowUrls()` helper | ✅ **Done** — `packages/sanity/src/indexnow.ts` |
| 2b. Blog: ping on post publish/update/unpublish | ✅ **Code done** — `apps/blog/src/app/api/revalidate/route.ts` |
| 2c. www: ping on case-study publish/update/unpublish | ✅ **Code done** — `apps/www/src/app/api/revalidate/route.ts` |
| Sanity webhook Projection updates (Studio dashboard) | ⏳ **Pending — human action required, not code** |
| Live verification (Bing Webmaster Tools → IndexNow log) | ⏳ **Pending**, blocked on the above |

## 1. Key file (done)

Served as a **static file**, not a dynamic app route (simpler than the dynamic-route approach
originally proposed, since the key rotates rarely):

- File: `/var/www/pakfactory-static/{key}.txt` on the Magento box (same directory as the
  hand-authored `sitemap.xml` — see nginx config)
- nginx: `location = /{key}.txt { alias ...; default_type text/plain; }`
- Verified live: `https://pakfactory.com/4161b1fa08554f0d86a7cbf046995da0.txt` → `200 text/plain`

**If the key ever rotates in Sanity Global Settings → IndexNow API key**, the nginx block and
the static file both need a matching manual update — nothing in the app re-derives this
automatically, by design (it's a one-time verification artifact, not app-served content).

## 2. Ping on publish (code done, needs Studio config)

Reuses the **existing** Sanity → Next.js revalidate webhooks (no new webhook pipeline):

```
Sanity doc change
  → existing webhook → apps/blog or apps/www /api/revalidate
      → revalidatePath/Tag (existing behavior, unchanged)
      → NEW: submitIndexNowUrls([canonicalUrl])
```

### Shared helper

`packages/sanity/src/indexnow.ts`, exported as `@pakfactory/sanity/indexnow`:
- `submitIndexNowUrls({ host, key, keyLocation, urls })` — normalizes URLs (strips `www.`,
  trailing slash, fragment), dedupes, filters to `host` only, chunks at IndexNow's 10,000/request
  limit, POSTs to `https://api.indexnow.org/indexnow`.
- Never throws — logs and swallows errors so a Bing outage can't break a publish/revalidate flow.
- **Not** in `@pakfactory/seo` — that package is explicitly JSON-LD-object-builders-only, no
  runtime I/O (see `packages/seo/CLAUDE.md`). `packages/sanity` already has the
  small-focused-runtime-module-per-subpath pattern (`resolve-document-href`, `social-platforms`,
  etc.), so `indexnow.ts` lives there instead.

### Blog (`apps/blog/src/app/api/revalidate/route.ts`)

- Scope: **`post` only** for now (not categories/tags/authors — deliberate first-slice decision;
  their slugs are already in the same webhook payload, so expanding later is a small diff, not
  a redesign).
- Reads `slug.current` from the webhook body (previously only `_type` was parsed).
- Canonical URL: `absoluteUrl(postDetailHref(slug))` → confirmed live as
  `https://pakfactory.com/blog/{slug}` (verified against the actual production sitemap output,
  not assumed — see "Origin verification" below).
- Reads the IndexNow key via `fetchBlogGlobalSettings().indexNowKey` (existing cached
  Global Settings loader; `indexNowKey` newly projected in `BLOG_GLOBAL_SETTINGS_QUERY`).

### www (`apps/www/src/app/api/revalidate/route.ts`)

- Scope: `caseStudy` only (mirrors blog's post-only scope).
- Already parsed `slug.current` for `caseStudy` — no new parsing needed.
- Canonical URL: `absoluteUrl(`/case-studies/${slug}`)` → `https://pakfactory.com/case-studies/{slug}`.
- Reads the IndexNow key via a direct `BLOG_GLOBAL_SETTINGS_QUERY` fetch (www has no cached
  global-settings wrapper the way blog does — a plain per-request fetch is fine here, this
  route only runs on a Sanity webhook, not page render).

### ⚠️ Required before this does anything live

**Both** Sanity webhooks' **Projection** field (Studio dashboard, not code) must include
`slug { current }` in their POST body for the relevant doc types (`post`; `caseStudy`).
Blog's revalidate route already reads `_type`; it did **not** previously request `slug` in the
projection, so until that's added in Studio, `slug` will be `undefined` and the IndexNow branch
is silently skipped (existing revalidation is unaffected either way).

**Unverified — needs a live test, not assumed:** whether Sanity's delete/unpublish webhook
event still carries `slug.current` in its payload. If it comes through empty on delete, the
ping is skipped for unpublish specifically (publish/update are unaffected). Flag and revisit
if Bing Webmaster Tools shows unpublish events aren't landing.

## Origin verification (done, no code change needed)

Confirmed directly against the live site (not assumed from env var config) that blog's
`NEXT_PUBLIC_SITE_URL` is already correct — every canonical URL in the production sitemap is
`https://pakfactory.com/blog/...` (non-www, no trailing slash), matching the ticket's
requirement exactly:

```
curl -s https://pakfactory.com/blog/posts-sitemap-1.xml | grep -o "<loc>[^<]*</loc>"
→ <loc>https://pakfactory.com/blog/artificial-intelligence-packaging-design</loc>  ...
```

www's `getSiteUrl()` already defaults to `https://pakfactory.com` in code
(`apps/www/src/lib/site.ts`) — same result, no verification needed beyond reading the source.

## Explicitly out of scope

Per the ticket's own BA-triage note ("comprehensive list of other public URLs... needed before
this can leave Triage"): Magento (`m2`) product/category pages and any other non-Sanity-driven
`pakfactory.com` surface. Those aren't Sanity-webhook-driven at all — would need a separate
Magento-side integration (different codebase, different trigger mechanism), tracked as a
follow-up ticket if/when scoped.

## Remaining steps (human, not code)

1. In Sanity Studio, add `slug { current }` to both webhooks' Projection (blog's `post`
   filter; www's `caseStudy` filter).
2. Publish/update/unpublish one blog post and one case study; confirm in Bing Webmaster
   Tools → IndexNow that the submission landed with the correct canonical URL.
3. If unpublish doesn't show up in the IndexNow log, investigate the delete-event payload
   shape per the "Unverified" note above.
