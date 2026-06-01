# ADR-003: Redirect strategy — 404-triggered, cached, tag-revalidated

**Status:** Accepted (2026-05-28). Implemented in [PROD-1602](https://dotdirect.atlassian.net/browse/PROD-1602).

## Context

The content-team field spec ([`docs/pakfactory-content-team-fields-final.md`](../pakfactory-content-team-fields-final.md) §6) requires CMS-managed redirects with a specific editorial property: **when an editor changes a published post's slug and republishes, a 301 from the old URL to the new URL must be auto-created (no editor action) and take effect within seconds, with no Vercel redeploy.** The reference behaviour is the WordPress *Redirection plugin*.

Existing redirects on the blog are code-only — [`apps/blog/next.config.ts`](../../apps/blog/next.config.ts) `redirects()` plus a few route-level `permanentRedirect` calls from PROD-1597 — and only cover the structural URL-scheme migration, not editorial / slug-change cases.

Constraints that shape the decision:

- **Stack:** Sanity v5, Next.js 16 App Router on Vercel; `unstable_cache` is the available data-cache primitive (Cache Components / `'use cache'` not enabled).
- **Sanity rate limits:** uncached API is **500 req/s per IP** and **500 concurrent queries per dataset**, with HTTP 429 on overrun; cached CDN reads are unlimited. (See `https://www.sanity.io/docs/content-lake/technical-limits`.) Vercel functions share egress IPs per region, so a naive "fetch Sanity per request" pattern can realistically trip the per-IP limit under bursts.
- **Cost shape:** the vast majority of blog traffic hits valid pages (home, archives, posts). Whatever we build should add **zero work on the hot path** and pay cost only on the genuinely-needed paths.

## Decision

**Option 3 — 404-triggered + tag-revalidated cache.**

- **Apply:** in [`apps/blog/src/app/[category]/page.tsx`](../../apps/blog/src/app/%5Bcategory%5D/page.tsx) and [`apps/blog/src/app/[...segments]/page.tsx`](../../apps/blog/src/app/%5B...segments%5D/page.tsx), look up the requested path in a redirect map **before calling `notFound()`**. The map lives in [`apps/blog/src/lib/blog-redirects.ts`](../../apps/blog/src/lib/blog-redirects.ts), wrapped in `unstable_cache` with a **60s TTL** and the `blog-redirects` cache tag. A bounded transitive resolver (≤5 hops + loop guard) handles any chain that slips past write-time collapse.
- **Status codes:** CMS stores `301` / `302`; the apply layer maps **301 → 308** (`permanentRedirect`) and **302 → 307** (`redirect`) because a Server Component can only emit 307/308. Google treats 308 as equivalent to 301 for canonicalisation / ranking, so this is SEO-neutral; the mapping is documented for future audits.
- **Freshness:** the **60s TTL is the guaranteed floor**; a secret-validated Sanity webhook at [`apps/blog/src/app/api/revalidate/route.ts`](../../apps/blog/src/app/api/revalidate/route.ts) calls `revalidateTag('blog-redirects', 'max')` for best-effort instant invalidation on redirect / post changes. (Next 16's `revalidateTag` now takes a `(tag, profile)` signature; semantics with `unstable_cache` tags are good-but-not-perfect, hence the TTL floor.)
- **Auto-create:** a custom Studio document action ([`apps/studio/actions/publishWithRedirect.ts`](../../apps/studio/actions/publishWithRedirect.ts), on `feature/sanity-studio-ux`) wraps publish on `post`, diffs old vs new slug, and writes/patches a `redirect` doc. Idempotent (patches existing `from` instead of duplicating), collapses chains (`*→/oldSlug` rewritten to `*→/newSlug`), and deletes any row whose `from` becomes the new live path (prevents self-loops on rename-back). Guardrails skip reserved root segments and category-slug collisions (PROD-1597 rule).

## Alternatives considered

### Option 1 — Build-time `next.config.redirects()` (Sanity's official guide)

Fetch all redirects at build, return them from `redirects()` so Vercel's routing layer applies them before any compute. Use `statusCode: 301` for literal 301s. Refresh via a Sanity webhook → Vercel deploy hook.

- **Pros:** **Zero per-request compute** — Vercel's edge router applies these from the routing manifest. Simplest mental model. Literal 301/302 supported. This is what both the 2023 Sanity guide and the current official Sanity docs recommend.
- **Cons:** Every redirect change requires a **full Vercel rebuild**. Editors expect slug-change redirects to fire immediately; a redeploy on every typo fix is operationally noisy and conflicts with the "no deploy" requirement. The webhook-triggered rebuild mitigates manual effort but not the lag.
- **Verdict:** rejected. Fundamentally incompatible with "no deploy" and the auto-create-on-slug-change workflow.

### Option 2 — Edge Config + narrow middleware

Sanity webhook syncs the active-redirect map into Vercel Edge Config. A narrow `middleware.ts` reads Edge Config on every matched request and issues a redirect when the path matches. Edge Config reads from the edge are ~sub-ms with no origin call, so per-request Sanity exposure is zero.

- **Pros:** Live within seconds of publish (Edge Config propagates globally in seconds). Can emit any status code (literal 301/302). Can redirect paths that **also** serve a live page (override), and can later carry wildcard / regex / host-level / marketing rules.
- **Cons:** Middleware runs on **100% of matched traffic** — a metered Vercel compute invocation on every page request even when no redirect matches. More moving parts (Edge Config sync job, webhook handler, cache invalidation, failure modes). Larger blast radius: a bug in middleware breaks every request, not just redirect requests.
- **Verdict:** **deferred.** It is the correct upgrade when we need redirects to fire **before** a live page renders, or for non-404 / wildcard / marketing rules. Not justified by slug-change redirects alone.

### Option 3 — 404-triggered + tag-revalidated cache (chosen)

Insert the redirect lookup in the route resolver **only when the request would otherwise 404**, against a cached map invalidated by the same Sanity webhook the blog already reserves.

- **Pros:** **Zero added cost on valid pages** — the lookup never runs when the URL resolves. Sanity is read **once per cache window** (≤60s) via the CDN, never per request — no rate-limit exposure. Live within seconds of publish via `revalidateTag`. Closest analog to WordPress *Redirection*'s pre-404 hook. Builds on the `blog-posts` webhook/tag pattern already reserved in [`apps/blog/memory.md`](../../apps/blog/memory.md). Smaller blast radius than middleware (only would-be-404 requests are affected by a bug here).
- **Cons:** Only handles **404-first** cases — cannot redirect away from a path that also resolves to a live page. Status codes constrained to 307/308 from Server Components (308 ≈ 301 SEO-wise, documented). Bounded transitive resolution + loop guard added as defence-in-depth in case write-time chain collapse misses an edge.
- **Verdict:** **chosen.** Slug-change is inherently 404-first; the constraint is a perfect fit, and zero hot-path cost is the right shape for a blog where almost all traffic hits live pages.

## Decision drivers

1. **Auto-redirect within seconds with no redeploy** rules out Option 1.
2. **Zero cost on the hot path** (valid pages) is the strongest signal toward Option 3 over Option 2 — middleware would tax every page request to handle a small minority of redirect requests.
3. **Sanity rate-limit safety under traffic bursts** — only feasible if the redirect map is local to the runtime, not fetched per request.
4. **Slug changes are 404-first by design** — there is no live page at the old slug after publish, so the 404 trigger is exactly the right hook.
5. **Reuse existing infrastructure** — the `blog-posts` webhook/tag is already reserved; one more tag (`blog-redirects`) is a small addition.

## Consequences

- Studio and blog sides are coupled by **dataset state** (the `redirect` document type), not code dependency, so the two halves ship on separate branches (`feature/sanity-studio-ux` and `feature/blog`) and reconverge at merge.
- The **301 → 308 / 302 → 307** mapping must be documented for any SEO audit. Strict literal 301/302 would require a route-handler hop or middleware; deferred unless audit insistence emerges.
- **Self-loop and chain hazards** are owned by the Studio document action (idempotent write, chain collapse, live-path-source delete). The apply layer's transitive resolver + hop cap is defence-in-depth, not the primary guard.
- **Structural redirects stay in code.** Precedence: `next.config.ts` (structural, PROD-1597) > CMS (editorial / auto slug-change) > 404. This separation should not be collapsed — structural rules are routing decisions, CMS rules are editorial.
- **Freshness is bounded by the 60s `unstable_cache` TTL**, not the webhook. The webhook is best-effort instant; the TTL is the guarantee. If Next 16 `revalidateTag` semantics with `unstable_cache` improve (or Cache Components are enabled), the webhook can become the primary freshness mechanism and the TTL can lengthen.

## Trigger to revisit

Re-evaluate **Option 2 (Edge Config + middleware)** when any of these are needed:

- A path must redirect even though it also resolves to a live page (override, not 404-first).
- **Wildcard / regex / host-level** redirect rules.
- **Marketing / campaign** redirects that must run before the `[category]` resolver.
- **Strict literal 301 / 302** status codes for an SEO audit that won't accept 308.

Re-evaluate **Option 1 (build-time)** if editorial volume drops to near-zero and the team is comfortable with a webhook-triggered rebuild per change (we don't expect this).

## Implementation references

| Side | Branch | Commits | Key files |
|------|--------|---------|-----------|
| Studio (schema + auto-create) | `feature/sanity-studio-ux` | `9f9acea` | `apps/studio/schemas/redirect.ts`, `apps/studio/actions/publishWithRedirect.ts`, `apps/studio/structure/index.ts`, `apps/studio/schemas/index.ts`, `apps/studio/sanity.config.ts` |
| Blog (apply + webhook) | `feature/blog` | `b1fb80c` + docs `08a554b` | `apps/blog/src/lib/blog-redirects.ts`, `apps/blog/src/app/[category]/page.tsx`, `apps/blog/src/app/[...segments]/page.tsx`, `apps/blog/src/app/api/revalidate/route.ts`, `apps/blog/src/lib/blog-cache.ts`, `packages/sanity/src/queries/blog.ts` |

Related docs: [`apps/blog/memory.md`](../../apps/blog/memory.md) § PROD-1602; [`docs/blog-3-jira-conventions.md`](../blog-3-jira-conventions.md) § PROD-1602; [`docs/pakfactory-content-team-fields-final.md`](../pakfactory-content-team-fields-final.md) §6.
