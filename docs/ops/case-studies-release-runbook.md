# Case Studies release runbook — `pakfactory.com/case-studies`

How to release the case-studies site (`apps/www`) at `pakfactory.com/case-studies`.
Same ALB→nginx→Vercel pattern as the blog — read the blog runbook's
[§7 Diagnostics cookbook](./blog-release-runbook.md#7-diagnostics-cookbook-transferable-to-any-albnginxvercel-launch)
first; this doc only covers what differs.

---

## 1. Architecture — and the one structural difference from the blog

```
viewer → Route53 → ALB → default → pakfactory TG → Magento nginx:
                                       location ^~ /case-studies ─ proxy ─→ apps/www (Vercel)
                                       location ^~ /_next/        ─ proxy ─→ apps/www (Vercel)
                                       location = /case-studies/sitemap.xml ─→ apps/www /sitemap.xml
                                       location = /llms.txt       ─ proxy ─→ apps/www /llms.txt
                                       everything else ── Magento
```

**The difference: `apps/www` has NO basePath.** It serves `/case-studies`
natively, so its JS/CSS chunks and the `/_next/image` optimizer live at the
**site root** `/_next/*`, not under `/case-studies/_next/*` (contrast the blog,
which namespaces everything under `/blog`). Consequences:

- You need a **second nginx location `^~ /_next/`** pointing at the www origin, or
  the page renders unstyled (every asset 404s). This was the headline finding of
  the PROD-1817 routing test.
- `/_next` at the domain root becomes **www-owned**. Safe today (Magento serves
  nothing there; the blog's assets are under `/blog/_next`), and it pre-wires the
  eventual state where `apps/www` replaces the Magento root entirely.

---

## 2. Origin decision — `*.vercel.app` is acceptable here (with a guardrail)

Unlike the blog project, the **`pakfactory-com-www` project is public** (no
Deployment Protection), so its `pakfactory-com-www.vercel.app` production URL
serves anonymously and can be the nginx origin directly — **no custom domain,
no Route53/ACM changes at all**.

> ⚠️ **Standing guardrail — write this on the ticket.** If Deployment Protection
> is ever enabled on `pakfactory-com-www` (likely, as the unfinished root site
> grows and previews need gating): choose **"Only Preview Deployments"**, OR add
> a custom production origin domain first (e.g. `origin.www.pakfactory.com`).
> "Standard Protection" gates the `.vercel.app` **production** alias too, which
> would 302 `pakfactory.com/case-studies` to Vercel SSO. Custom production
> domains are always exempt.

Also: don't **rename** the Vercel project (breaks the origin hostname — loud
failure, one-line fix).

---

## 3. Release steps

1. **Vercel env** — `WWW_DISABLE_INDEXING` → `0` / unset (pages currently emit
   `noindex, nofollow`). `NEXT_PUBLIC_SITE_URL` is already apex; canonicals
   already read `https://pakfactory.com/case-studies/...`. Redeploy.
2. **nginx** (all web nodes) — four locations in the `pakfactory.com` vhost:
   ```nginx
   # Case Studies (apps/www, Vercel) at pakfactory.com/case-studies.
   # ^~ shields .css/.js from the Minify regex handlers.
   location ^~ /case-studies {
       proxy_pass            https://pakfactory-com-www.vercel.app;
       proxy_set_header      Host pakfactory-com-www.vercel.app;
       proxy_ssl_server_name on;
       proxy_http_version    1.1;
       proxy_set_header      X-Forwarded-Proto https;
   }
   # apps/www has NO basePath → its assets + image optimizer are at the ROOT.
   location ^~ /_next/ {
       proxy_pass            https://pakfactory-com-www.vercel.app;
       proxy_set_header      Host pakfactory-com-www.vercel.app;
       proxy_ssl_server_name on;
       proxy_http_version    1.1;
       proxy_set_header      X-Forwarded-Proto https;
   }
   # SEO files (see §4). Exact `=` beats the ^~ prefixes.
   location = /case-studies/sitemap.xml { proxy_pass https://pakfactory-com-www.vercel.app/sitemap.xml; proxy_set_header Host pakfactory-com-www.vercel.app; proxy_ssl_server_name on; proxy_http_version 1.1; }
   location = /llms.txt                 { proxy_pass https://pakfactory-com-www.vercel.app/llms.txt;     proxy_set_header Host pakfactory-com-www.vercel.app; proxy_ssl_server_name on; proxy_http_version 1.1; }
   ```
   `sudo nginx -t && sudo systemctl reload nginx`.
3. **RFQ / lead form check** — if any case-studies page POSTs to an `/api/*` route
   on www, that path currently falls to Magento. Magento uses `/rest` + `/graphql`,
   so `/api` should be free — but **test the form through the proxy**; if it
   breaks, add a `location ^~ /api/` → www.

**AWS: no changes.** No ALB rule for `/case-studies` exists or is needed — it
falls through the default rule to nginx. Do **not** add one (an ALB can't forward
to an external Vercel origin, and a stray rule would shadow nginx).

---

## 4. SEO surfaces — one file per domain (RFC 9309)

- **robots.txt** — the public one is **Magento's** (add the two `Sitemap:` lines;
  see blog runbook §6). ⚠️ **Never proxy www's own `/robots.txt` to the public
  root:** it says `Disallow: /` (correct hygiene for the *origin* host), which
  would de-index the entire storefront. It stays scoped to the Vercel origin. Also:
  robots 5xx pauses domain-wide crawling, so keeping robots on Magento decouples
  the storefront's crawlability from Vercel availability.
- **sitemap** — www serves it at its origin root `/sitemap.xml` (already emits
  `https://pakfactory.com/case-studies/...` URLs). The `location =
  /case-studies/sitemap.xml` above publishes it at a protocol-correct nested path.
  Submit in GSC.
- **llms.txt** — the domain's single `llms.txt` is **generated dynamically by
  `apps/www`** (`/llms.txt` route) from live Sanity content (blog + case studies
  share the dataset): 20 most-recently-modified case studies, blog categories +
  10 recent posts, sitemap links. ISR 1h. Editorial knobs in Studio → Settings →
  Crawlers & AI: `llms.txt — manual override` (verbatim escape hatch) and
  `llms.txt — storefront links (Magento)` (the "Products & Packaging" section;
  omitted while empty). Exposed at the domain root via the `location = /llms.txt`
  block above. No script/cron — publishing content updates it within the hour.

---

## 5. Verification matrix

```bash
curl -sI https://pakfactory.com/case-studies | grep -iE "HTTP|server"          # 200 (Vercel via nginx)
curl -sI https://pakfactory.com/case-studies/<slug> | head -1                  # 200
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://pakfactory.com$(curl -s https://pakfactory-com-www.vercel.app/case-studies \
     | grep -oE '/_next/static[^"]*\.css[^"]*' | head -1)"                      # 200 (the /_next route)
curl -s https://pakfactory.com/case-studies | grep -o '<meta name="robots"[^>]*>'   # index, follow (post env flip)
curl -s https://pakfactory.com/case-studies/sitemap.xml | head -3              # XML, apex URLs
curl -s https://pakfactory.com/llms.txt | head -3                              # "# PakFactory"
curl -s https://pakfactory.com/robots.txt | grep -i sitemap                    # both Sitemap lines
curl -sI https://pakfactory.com/ | grep -i server                             # Magento, unchanged
```

---

## 6. Rollback

Remove the four nginx locations → `nginx -t && reload`. `/case-studies`,
`/_next`, and `/llms.txt` return to Magento (404 / its own handling). Revert the
Vercel env flip if needed. No AWS or app rollback — everything here is additive
nginx + one env var.

---

## 7. Sunset note

This plumbing is **temporary**. When `apps/www` is ready to replace the Magento
storefront at the domain root, the cutover is a DNS/infra event (point
`pakfactory.com` at the www origin) that **removes** these nginx proxy blocks —
www then serves `/`, `/case-studies`, `/_next`, `/robots.txt`, `/llms.txt`
natively. The `/llms.txt` generator and the SEO structure already assume that end
state (the "Products & Packaging" Studio field just gets edited out once Magento
is gone), so no re-architecting is required — only removing the bridge.
