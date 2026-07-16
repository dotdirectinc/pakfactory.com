# Blog release runbook — `pakfactory.com/blog`

How to release (or re-release, extend, or roll back) the blog at
`pakfactory.com/blog`, and how the old WordPress blog was archived to
`backup.blog.pakfactory.com`. Written from the 2026-07-15 launch.

The blog is a **Next.js (Vercel) app served under a subpath of a domain whose
root is Magento**. Because the root is Magento — not a Next app — the classic
Next "multi-zones" approach does **not** apply; routing happens at the
**ALB → nginx** layer instead. This same pattern is reused for case studies
(see [`case-studies-release-runbook.md`](./case-studies-release-runbook.md)).

---

## 1. Final architecture

```
                         ┌─ Host: blog.pakfactory.com        → ALB 301 → pakfactory.com/blog
viewer → Route53 → ALB ──┤─ Host: backup.blog.pakfactory.com → wp-new target group (old WordPress, EC2)
                         └─ default                          → pakfactory target group → nginx
                                                                        │
                          Magento nginx (pakfactory.com vhost):         │
                            location ^~ /blog  ─ proxy ─────────────────┼─→ origin.blog.pakfactory.com  (Vercel, apps/blog)
                            everything else    ── Magento (PHP-FPM)      │
```

| Hostname / path | Serves | Owner layer |
|---|---|---|
| `pakfactory.com/*` | Magento storefront | nginx + PHP-FPM |
| `pakfactory.com/blog/*` | New blog | nginx `^~ /blog` → Vercel `origin.blog.pakfactory.com` |
| `blog.pakfactory.com` | 301 → `pakfactory.com/blog` | ALB listener rule |
| `backup.blog.pakfactory.com` | Old WordPress blog (archive) | ALB host rule → EC2 |
| `origin.blog.pakfactory.com` | Vercel production origin (internal — not advertised) | Vercel custom domain |

**Why a custom origin domain** (`origin.blog.pakfactory.com`) instead of the
project's `*.vercel.app` URL: the blog Vercel project has **Deployment
Protection** enabled, which SSO-gates the auto-generated `.vercel.app` URLs
(they 302 to `vercel.com/sso-api`). A **custom production domain is always
public**, so it is the only viable origin. It is also stable — the `.vercel.app`
name changes if the project is renamed, which would silently break nginx.

---

## 2. App prerequisites (already shipped — verify, don't rebuild)

- **Env-driven basePath** (`apps/blog/next.config.ts`): `basePath` is read from
  `NEXT_PUBLIC_BLOG_BASE_PATH` — the *same* env var `src/lib/site.ts` uses for
  canonicals/JSON-LD/RSS/sitemaps. One variable flips the whole app. Unset
  (staging/previews/local) → origin-root; set `/blog` → everything under `/blog`.
- **Never** hand-concatenate the origin with a path — use `absoluteUrl()` /
  `sitePath()` so the prefix is applied. This is why sitemaps/canonicals "just
  work" after the flip.

### Production env matrix (Vercel → blog project → Settings → Environment Variables)

| Var | Value | Note |
|---|---|---|
| `NEXT_PUBLIC_BLOG_BASE_PATH` | `/blog` | flips routing + self-referencing URLs |
| `NEXT_PUBLIC_SITE_URL` | `https://pakfactory.com` | **apex** (the ALB 301s www→apex) — origin only, no path |
| `BLOG_DISABLE_INDEXING` | `0` / unset | ⚠️ often left `1` during QA — must be off at launch |

> Vercel CLI note: env vars added via `vercel env add` may read back blank in
> `vercel env pull` if the team marks them Sensitive. Don't trust the read-back;
> verify by redeploying and testing the built behavior.

---

## 3. Staged QA on the live domain (the `/blog-new` pattern)

To test on the real domain before flipping the public path, temporarily serve
the app at an obscure path:

1. Set `NEXT_PUBLIC_BLOG_BASE_PATH=/blog-new` on the prod project → redeploy →
   verify `origin.blog.pakfactory.com/blog-new` works.
2. Point nginx `location ^~ /blog-new` at the origin, QA end-to-end.
3. At launch, flip the env back to `/blog` and rename the nginx location.

Reusable for any future subpath slice. During QA keep `BLOG_DISABLE_INDEXING=1`
so the temporary path can't be indexed.

---

## 4. Release-day sequence (order matters — rationale inline)

1. **Vercel domain + DNS.** Add `origin.blog.pakfactory.com` to the blog
   project; Route53 `CNAME origin.blog.pakfactory.com → cname.vercel-dns.com`.
   Verify `https://origin.blog.pakfactory.com/blog` → `200`, `server: Vercel`.
2. **Env flip + redeploy** (matrix above). Verify the origin serves `/blog` and
   root 404s (basePath is baked at build time — the origin only serves `/blog/*`).
3. **nginx** (all web nodes behind the ALB) — add to the `pakfactory.com` vhost:
   ```nginx
   # New blog (Vercel) at pakfactory.com/blog. basePath keeps pages, /blog/_next/*
   # assets and the image optimizer all under /blog → one block. `^~` skips the
   # regex Minify handlers (see §7).
   location ^~ /blog {
       proxy_pass            https://origin.blog.pakfactory.com;   # path forwarded as-is
       proxy_set_header      Host origin.blog.pakfactory.com;      # Vercel routes by Host
       proxy_ssl_server_name on;                                    # SNI — else 502
       proxy_http_version    1.1;
       proxy_set_header      X-Forwarded-Proto https;
   }
   # `^~ /blog` also prefix-matches /blog-new, so the QA redirect needs its own
   # (longer) prefix location or it never fires.
   location ^~ /blog-new { rewrite ^/blog-new(/.*)?$ /blog$1 permanent; }
   ```
   `sudo nginx -t && sudo systemctl reload nginx`.
   > ⚠️ Reload only **after** DNS resolves the origin to Vercel — otherwise nginx
   > proxies into a stale ALB/redirect and can loop.
4. **`blog.pakfactory.com` 301** — already an ALB rule (see §9); if its Route53
   record was removed, restore it as an **Alias A → the ALB**. No app change.

Verify (§8) before announcing.

---

## 5. Old blog archival — moving the WordPress site to `backup.blog.pakfactory.com`

The old blog was WordPress (Elementor + WP Rocket) on EC2 `172.31.32.193`, served
at `pakfactory.com/blog` via an ALB path rule. Moving it took several passes —
each gotcha below is a real one hit during launch.

### 5a. Routing (AWS)
1. **ALB rule** — the rule that forwarded `/blog/*` to the old-blog target group
   (`wp-new`): change its condition from `Path = /blog/*` to
   **`Host header = backup.blog.pakfactory.com`** (drop the path condition). Now
   `pakfactory.com/blog/*` falls through to nginx→Vercel, and the old blog is
   reachable only via the archive host.
2. **ACM** — `*.pakfactory.com` does **not** cover `backup.blog.pakfactory.com`
   (wildcards match one label). Request a cert for `backup.blog.pakfactory.com`
   (DNS-validated), then **attach it to the HTTPS:443 listener** (ALB serves
   multiple certs via SNI). Do this *before* the DNS flip.
3. **Route53** — `backup.blog.pakfactory.com` → **Alias A → the ALB**.

### 5b. WordPress host move (on the EC2 box)
Order matters; symptoms noted:
1. **`wp-config.php`** — set both, exact spelling (`WP_SITEURL`, *not*
   `WP_SITE_URL`), before `wp-settings.php`:
   ```php
   define('WP_HOME',    'https://backup.blog.pakfactory.com');
   define('WP_SITEURL', 'https://backup.blog.pakfactory.com');
   ```
   - `WP_HOME` fixes page/canonical/feed URLs; `WP_SITEURL` fixes
     `wp-content`/`wp-includes` **asset** URLs. A page with new-host canonicals
     but old-host CSS/JS = `WP_SITEURL` not applied (wrong spelling or wrong
     placement).
   - The box already trusts `X-Forwarded-Proto` (TLS terminates at the ALB); keep
     that snippet or WordPress redirect-loops thinking it's on http.
2. **Apache vhost** — `DocumentRoot` must point at the WP directory **and**
   `ServerName` must match the new Host (`backup.blog.pakfactory.com`).
   *Symptom of a missing/mismatched `ServerName`:* Apache falls through to the
   default vhost and serves a stray file (we hit a `/var/www/html/index.html`
   containing "hi"). `sudo a2dissite 000-default` to retire the catch-all.
3. **`.htaccess`** in the WP dir — `RewriteBase /` (was `/blog/`). Optional
   `RedirectMatch 301 ^/blog/(.*)$ /$1` for old deep links.
4. **Content URLs (DB)** — `wp search-replace 'https://pakfactory.com/blog'
   'https://backup.blog.pakfactory.com' --all-tables` (dry-run first).
   **Never** raw SQL `REPLACE` — WordPress stores PHP-serialized data (options,
   Elementor); byte-length-changing SQL replace corrupts it. WP-CLI is
   serialization-safe. (Install: `curl -O …/wp-cli.phar` → `/usr/local/bin/wp`;
   run with `--allow-root` from the WP dir.)
5. **Generated files on disk** — `wp search-replace` touches the DB **only**.
   Elementor CSS (`wp-content/uploads/elementor/…`) and WP Rocket "Used CSS"
   inline the old host at generation time → *symptom: CORS-blocked fonts from
   `pakfactory.com/blog/...`*. Fix: `wp elementor flush-css`, then
   `grep -rl 'pakfactory.com/blog' wp-content/uploads/ | xargs sed -i
   's#https://pakfactory.com/blog#https://backup.blog.pakfactory.com#g'`, then
   **WP Rocket → Clear Used CSS + Clear cache** (`rm -rf
   wp-content/cache/{wp-rocket,used-css}/*`).
6. **Purge WP Rocket after every change** — cached pages mask each fix. Cache-
   bypass test: append a random `?query`.

---

## 6. Post-release SEO

- **robots.txt / llms.txt are per-host, root-only (RFC 9309).** The blog serves
  **neither** of its own — under basePath they'd only appear at `/blog/…`, which
  crawlers ignore. The single public `robots.txt` is **Magento's** (add the
  `Sitemap:` lines below); the single public `llms.txt` is **generated by
  `apps/www`** at the domain root (aggregates blog + case studies from the shared
  dataset). See the case-studies runbook §4.
- **Magento robots.txt** — add:
  ```
  Sitemap: https://pakfactory.com/blog/sitemap.xml
  Sitemap: https://pakfactory.com/case-studies/sitemap.xml
  ```
- **GSC** — submit `https://pakfactory.com/blog/sitemap.xml` on the pakfactory.com
  property.
- **CMS redirects (old-post equity).** Old post URLs are covered by Sanity
  `redirect` docs, applied at request time in `apps/blog/src/lib/blog-redirects.ts`.
  ⚠️ **basePath gotcha (fixed):** docs store public URLs (`from: /blog/old/`) but
  routes see prefix-less paths and `redirect()` re-prepends the base path, so the
  module strips `BLOG_BASE_PATH` from `from`, internal `to`, and the lookup. If
  redirects 404 under a future subpath, this normalization is the thing to check.
  Coverage was measured by diffing the old sitemap's slugs against Sanity post
  slugs + active redirect `from`s.

---

## 7. Diagnostics cookbook (transferable to any ALB→nginx→Vercel launch)

- **"Did this request pass through nginx?"** nginx replaces the upstream's
  `Server:` header with its own. A response saying `server: Apache` (or `Vercel`)
  therefore did **not** pass through nginx — the ALB routed it elsewhere. This
  single technique isolated the "ALB rule shadows nginx" class of bug.
- **ALB rules run before nginx.** A leftover `Path = /blog/*` listener rule
  intercepts traffic before it reaches the web nodes; no nginx edit can fix it.
  Signature: bare `/blog` works (misses `/*`) but everything under `/blog/` hits
  the wrong origin.
- **nginx location precedence:** exact `=` > `^~` prefix > regex `~` > plain
  prefix. Magento's `location ~ \.css$ { perl Minify… }` (a regex) will hijack
  `/blog/_next/*.css` unless the blog uses `^~ /blog`. Same trap bit case studies
  (`^~ /_next/`).
- **Fonts fail silently, per-machine.** A `font-family` naming a font not shipped
  via `@font-face` resolves against whatever is installed on the viewer's device
  (see PROD-2010). Test in **incognito / clean profile**, not your daily browser.
- **Cache poisons diagnosis.** Vercel/WP-Rocket/CDN caches and browser bfcache
  each mask fixes. Cache-bypass with a `?query`; incognito for a clean client;
  `x-vercel-cache` / `age` headers reveal edge cache state.

---

## 8. Verification matrix

```bash
# New blog
curl -sI https://pakfactory.com/blog | grep -iE "HTTP|server"          # 200, server: nginx (proxied Vercel)
curl -sI https://pakfactory.com/blog/topics | head -1                  # 200
curl -s -o /dev/null -w "%{http_code}\n" \
  https://pakfactory.com/blog/_next/static/chunks/<hash>.css           # 200 (asset routing / Minify not hijacking)
curl -s https://pakfactory.com/blog | grep -o '<meta name="robots"[^>]*>'   # index, follow (kill switch off)
# Redirects
curl -sIL https://pakfactory.com/blog/<old-slug>/ | grep -iE "HTTP|location"  # 308 → canonical, then 200
# Subdomain redirect + old blog + Magento untouched
curl -sI https://blog.pakfactory.com/x | grep -i location              # → pakfactory.com/blog/x
curl -sI https://backup.blog.pakfactory.com/ | grep -iE "HTTP|server"  # 200, Apache (old blog)
curl -sI https://pakfactory.com/ | grep -i server                      # Magento, unchanged
```

---

## 9. ALB listener rules (HTTPS:443) — final state

Rules evaluate in priority order (lowest first).

| Priority | Condition | Action |
|---|---|---|
| 1 | Host = `blog.pakfactory.com` | Redirect 301 → `https://pakfactory.com:443/blog` (+query) |
| 2 | Host = `www.pakfactory.com` | Redirect 301 → `https://pakfactory.com:443/#{path}` (apex) |
| 3 | Host = `backup.blog.pakfactory.com` | Forward → `wp-new` TG (old WordPress) |
| 10 | Path = `/blog_old/*` | Forward → `wordpress` TG (legacy, unrelated) |
| default | — | Forward → `pakfactory` TG (Magento nginx) |

> To preserve deep links on the subdomain redirect, rule 1's path can be set to
> `/blog#{path}` (it currently drops the path) — useful once the redirect map is
> in place.

---

## 10. Rollback (cheapest first)

| Undo | How |
|---|---|
| New blog at `/blog` | Remove the nginx `^~ /blog` block → reload. Falls to Magento 404. |
| Env flip | Revert `NEXT_PUBLIC_BLOG_BASE_PATH` on Vercel → redeploy (origin serves at root again). |
| `backup.blog` routing | Restore ALB rule 3 to its prior condition; revert Route53. |
| Everything | The blog app changes are additive; reverting infra restores the pre-launch state with no app rollback needed. |
