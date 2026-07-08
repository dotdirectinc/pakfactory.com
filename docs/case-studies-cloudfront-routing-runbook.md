# Case-studies CloudFront routing (PROD-1817)

Test that CloudFront can serve a site from a default origin while **peeling a sub-route
off to a different origin** — here, routing `/case-studies/*` to the Vercel deployment of
`apps/www` while everything else goes to a separate default origin. The default origin in
this test is a throwaway **Express server on a t3.micro** (stand-in for the main site); the
real subject under test is the **CloudFront multi-origin routing** for case-studies.

```
                        ┌─ default (*)        → test-api.pakfactory.com          (Express / t3.micro, stand-in)
viewer → CloudFront ────┤
                        └─ /case-studies/*     → pakfactory-com-www.vercel.app     (apps/www case-studies)
```

**Confirmed:** `test-api.pakfactory.com/health` → `{"status":"ok",...}` (HTTPS good);
`pakfactory-com-www.vercel.app/case-studies` serves real content publicly (no deployment
protection) and is served **natively under `/case-studies`** → **no URI rewrite needed**.
**t3.micro is fine** — it only serves the default origin; CloudFront does the routing.

## Inputs

| Var | Value | Notes |
|-----|-------|-------|
| `DEFAULT_ORIGIN` | `test-api.pakfactory.com` | confirmed up, HTTPS |
| `VERCEL_ORIGIN` | `pakfactory-com-www.vercel.app` | confirmed public, serves `/case-studies` natively |
| `PREFIX` | `/case-studies` | routes to Vercel; forwarded as-is (no strip) |
| `VIEWER_DOMAIN` | `dXXXX.cloudfront.net` (or a new CNAME like `test-cdn.pakfactory.com`) | **not** `test-api` (that's the origin) |

*(Working distribution during testing: `d1ee3hwfrx2vt7.cloudfront.net`.)*

---

## 1. Create the distribution with two origins

Console → CloudFront → Create distribution.

**Origin A — default (Express):**
| Field | Value |
|-------|-------|
| Origin domain | `test-api.pakfactory.com` |
| Origin type | **Custom origin** (HTTPS only, port 443, min TLS 1.2) |
| Origin ID | `express-default` |

**Origin B — Vercel (add a second origin after the distribution exists):**
| Field | Value |
|-------|-------|
| Origin domain | `pakfactory-com-www.vercel.app` |
| Origin type | **Custom origin** (HTTPS only, port 443, min TLS 1.2) |
| Origin ID | `vercel-case-studies` |
| Host header | leave CloudFront default → it sends `pakfactory-com-www.vercel.app` as Host, which Vercel routes on. **Do not** forward the viewer Host unless you've added `VIEWER_DOMAIN` as a custom domain on the Vercel project. |

> A distribution takes only one origin at creation. Add Origin B afterward via the
> distribution's **Origins** tab → **Create origin**. Adding an origin does nothing until a
> **behavior** points at it (step below).

**Default cache behavior** (`Default (*)`):
| Field | Value |
|-------|-------|
| Origin | `express-default` |
| Viewer protocol | Redirect HTTP → HTTPS |
| Allowed methods | GET, HEAD, OPTIONS (add POST/PUT/etc. only if the Express app needs it) |
| Cache policy | `CachingDisabled` for a pure routing test (or respect origin headers) |

**Add behavior for the sub-route** (Behaviors tab → Create behavior):
| Field | Value |
|-------|-------|
| Path pattern | `/case-studies/*` |
| Origin | `vercel-case-studies` |
| Viewer protocol | Redirect HTTP → HTTPS |
| Cache policy | `CachingOptimized` (Vercel sends good `Cache-Control`) |
| Origin request policy | default — leave Host = `pakfactory-com-www.vercel.app` (don't use `AllViewer` unless the viewer domain is added to Vercel) |

> Path-pattern precedence: `/case-studies/*` is matched before `Default (*)`, so only that
> sub-tree hits Vercel; everything else hits Express. If you also need the bare
> `/case-studies` (no trailing slash), add a second behavior for exactly `/case-studies`.

**Alternate domain / TLS** (optional): to use `test-cdn.pakfactory.com` instead of the raw
`dXXXX.cloudfront.net`, add it as an alternate domain and attach an **ACM cert in
`us-east-1`**, then CNAME it to the distribution domain.

---

## 2. URI prefix — no rewrite needed ✅

The Vercel app serves case studies **natively under `/case-studies`**, so CloudFront
forwards the path **as-is** — no Origin path, no CloudFront Function.

### 2b. Route the Next.js assets too (required — else no styles/JS)

The case-studies HTML loads under `/case-studies/*`, but it references its assets at the
**site root** under `/_next/...` (JS chunks, CSS, and the `/_next/image` optimizer). Those
don't match `/case-studies/*`, so without a second behavior they fall through to the Express
default origin → **404 on every asset** (page renders unstyled). Add a `/_next/*` behavior:

| Field | Value |
|-------|-------|
| Path pattern | `/_next/*` |
| Origin | `vercel-case-studies` |
| Viewer protocol | Redirect HTTP → HTTPS |
| Allowed methods | GET, HEAD |
| **Cache policy** | `CachingDisabled` |
| **Origin request policy** | `AllViewerExceptHostHeader` |

**Why this policy pair (not `CachingOptimized`):** `/_next/image?url=…&w=…&q=75` (the Next
image optimizer — used by the navbar logo) **requires its query string** at the origin.
`CachingOptimized` forwards **Query strings = None**, so the optimizer gets a bare
`/_next/image` and returns **400 Bad Request**. The fix is to forward the query string.
Custom cache policies weren't available in this account, and the console didn't offer the
"legacy cache settings" toggle, so use the two **managed** policies above:

- `AllViewerExceptHostHeader` forwards **all query strings** (and headers/cookies) to Vercel
  → optimizer gets `url`/`w`/`q` → logo resolves.
- The **"ExceptHostHeader"** part is essential: it keeps `Host = pakfactory-com-www.vercel.app`
  so Vercel routes correctly. Plain `AllViewer` would forward the viewer host and mis-route.
- `CachingDisabled` means no edge caching on `/_next/*` — fine for a routing test, and it
  avoids any cache-key/query-string mismatch (never collapse image variants onto one entry).

Everything under `/_next` is safe to route to Vercel because the Express test server has
nothing there. External images come from `images.unsplash.com` directly (not via CloudFront).
A lone `/favicon.ico` 404 is cosmetic — add a `/favicon.ico` behavior → Vercel to silence it.
If the app later needs other root-level assets (`/fonts/*`, `/images/*`) or client API calls
(`/api/*` the Express server doesn't own), route those to Vercel the same way.

<details><summary>Reference only — if the app had served at root (<code>/slug</code>)</summary>

You'd strip the prefix with a CloudFront Function (viewer request) on the `/case-studies/*`
behavior, since Origin path can only *prepend*:

```js
function handler(event) {
  var req = event.request;
  req.uri = req.uri.replace(/^\/case-studies(\/|$)/, '/');
  return req;
}
```
</details>

---

## 3. Validate

```bash
CF=d1ee3hwfrx2vt7.cloudfront.net    # or test-cdn.pakfactory.com

# default origin (Express) still answers
curl -sI https://$CF/health
curl -s  https://$CF/health         # expect {"status":"ok",...}

# sub-route lands on Vercel
curl -sI https://$CF/case-studies/mock-sustainable-mailer-acme   # expect 200 from Vercel
curl -sI "https://$CF/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo.17dqgendhfo47.png&w=3840&q=75"  # expect 200, not 400
```

Prove which origin served each path via response headers:
- Vercel responses carry `x-vercel-*` / `server: Vercel`.
- Express responses carry `x-powered-by: Express`.

In a browser: `https://$CF/case-studies/mock-sustainable-mailer-acme` renders **with styles**,
no console 404/400s (favicon aside), and non-case-studies paths fall back to Express.

---

## 4. Serve it under a friendly domain (`test-api.pakfactory.com/case-studies`)

The routing above only works through the CloudFront domain (`dXXXX.cloudfront.net`).
`test-api.pakfactory.com` is an **A record → the EC2 box (`54.83.251.86`) → nginx → Express**,
so hitting it directly bypasses CloudFront and returns Express's `{"error":"not found"}`.
Two ways to make `test-api.pakfactory.com/case-studies` serve the case-studies:

### Option A — nginx reverse-proxy on the box (no CloudFront needed) ✅ simplest

Because `test-api` is already nginx terminating HTTPS, do the same routing at nginx. **This
needs no CloudFront, no ACM cert, no DNS change.** Add inside the port-443 `server {}` block
(e.g. `/etc/nginx/sites-enabled/…` on the box):

```nginx
# /case-studies pages -> Vercel (path preserved; app serves natively under /case-studies)
location /case-studies {
    proxy_pass            https://pakfactory-com-www.vercel.app;
    proxy_set_header      Host pakfactory-com-www.vercel.app;   # Vercel routes by Host
    proxy_ssl_server_name on;                                    # send SNI to Vercel (else 502)
    proxy_http_version    1.1;
    proxy_set_header      X-Forwarded-Proto https;
}
# Next.js assets: JS/CSS chunks + /_next/image optimizer (query string preserved by default)
location /_next/ {
    proxy_pass            https://pakfactory-com-www.vercel.app;
    proxy_set_header      Host pakfactory-com-www.vercel.app;
    proxy_ssl_server_name on;
    proxy_http_version    1.1;
}
```
```bash
sudo nginx -t && sudo systemctl reload nginx
# view: https://test-api.pakfactory.com/case-studies/mock-sustainable-mailer-acme
```

Maps 1:1 to the CloudFront config: `proxy_pass` with **no trailing URI** preserves the path
(no rewrite); the `Host` override is the equivalent of CloudFront's *ExceptHostHeader*; nginx
forwards the query string by default (the `/_next/image` 400 fix); a more-specific `location`
beats the catch-all that proxies to Express, so everything else still hits the Express app.

Notes: this routes at **nginx, not CloudFront** — no edge caching, and it does **not**
exercise the CDN path. Canonical/OG URLs in the HTML may still read `pakfactory-com-www.vercel.app`
(cosmetic). To survive Vercel IP changes without a reload, use a `resolver` + variable:
`resolver 1.1.1.1 valid=300s; set $u pakfactory-com-www.vercel.app; proxy_pass https://$u$request_uri;`.

### Option B — put `test-api` behind CloudFront (keeps the CDN in the path)

Use only if the CDN must front this hostname. `test-api` can't be **both** the CloudFront
alternate domain and the default origin (infinite loop), so:

1. **Rename the origin:** create `origin.pakfactory.com` → A → `54.83.251.86`; change the
   distribution's `express-default` origin domain to `origin.pakfactory.com`. (CloudFront→origin
   can be HTTP to skip a cert on the new name; viewer→CloudFront stays HTTPS.)
2. **ACM cert** for `test-api.pakfactory.com` in **us-east-1**; add `test-api.pakfactory.com`
   as an **Alternate domain (CNAME)** on the distribution.
3. **Repoint DNS:** change `test-api.pakfactory.com` from `A 54.83.251.86` to
   **CNAME → `dXXXX.cloudfront.net`**.

Result: `test-api.pakfactory.com/case-studies` → Vercel, everything else → Express, with
CloudFront in front. More moving parts (cert + DNS cutover + origin rename) than Option A.

> **Do you even need CloudFront?** For "just view/demo case-studies under `test-api`", **no** —
> Option A is complete on its own. CloudFront only matters if you're validating CDN-layer
> routing. Note prod `pakfactory.com` is served by **nginx directly** (no CloudFront/Fastly on
> the root today), so the eventual prod design is a separate decision from this test.

---

## 5. Teardown

**nginx (Option A):** remove the two `location` blocks → `sudo nginx -t && sudo systemctl reload nginx`.

**CloudFront (Option B / the test distribution):**
```bash
# disable the distribution first, wait for Deployed, then:
aws cloudfront delete-distribution --id EXXXX --if-match <etag>
# revert test-api DNS to A 54.83.251.86; remove the CNAME + ACM cert if you created them
```

The Express t3.micro can stay — it's shared test infra, not part of this distribution's cost.

---

## Gotchas (from actually standing this up)

- **Viewer domain ≠ origin domain.** `test-api.pakfactory.com` is the *origin*; viewers hit
  the CloudFront domain (or a new CNAME). Don't point the same hostname at both.
- **Assets live at the site root, not under the sub-route.** Routing `/case-studies/*` alone
  gives an unstyled page (404s on `/_next/*`). You must also route `/_next/*` (step 2b).
- **`/_next/image` needs its query string** or returns 400 — forward query strings via
  `AllViewerExceptHostHeader` (step 2b).
- **Vercel routes by Host** — keep Host = the `*.vercel.app` origin (hence *ExceptHostHeader*),
  don't forward the viewer host unless that domain is registered on the Vercel project.
- **No prefix strip needed** — the app serves under `/case-studies` natively.
- **POST/OPTIONS:** if the case-studies app gains forms/API routes, widen Allowed methods on
  the `/case-studies/*` behavior.
- **Friendly domain:** `test-api.pakfactory.com` points straight at the box, so CloudFront is
  **not** in that path. Serve `/case-studies` there via nginx on the box (§4 Option A, no
  CloudFront) or repoint `test-api` at the distribution (§4 Option B). nginx-only fully works;
  CloudFront is only needed to validate CDN-layer routing.
