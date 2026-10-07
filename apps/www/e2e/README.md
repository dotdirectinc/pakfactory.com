# www RFQ end-to-end tests (Playwright)

Every entrance a buyer can take into a quote request, driven through the real UI.

## Run

```bash
pnpm --filter @pakfactory/www test:e2e            # local dev server (:3003), started or reused
pnpm --filter @pakfactory/www test:e2e:staging    # deployed www-new-release (staging.pakfactory.com)
```

| Env var | Purpose |
|---|---|
| `E2E_TARGET=staging` | Target the deployed build instead of local |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | **Required for staging** — it sits behind Vercel Authentication. Vercel → `pakfactory-com` → Settings → Deployment Protection → Protection Bypass for Automation |
| `E2E_BASE_URL` | Override the URL for either target (e.g. a branch preview) |
| `E2E_SUBMIT=1` | Actually submit. **Off by default.** |

### Submitting is opt-in

A submit goes through the `submitRequest` server action → backend API → the
staging database (and on to the CRM). By default each flow fills every required
field, asserts **Request a quote** is enabled, and stops. With `E2E_SUBMIT=1` it
submits and asserts the success dialog shows an `RFQ-` ref. Locally that needs
the backend at `BACKEND_API_BASE_URL` (`localhost:8080`) running.

Every free-text value starts with `[E2E]` and the contact is
`e2e+rfq@dotdirect.ca`, so submitted rows are findable and removable.

## Content fixtures

Navigation is by visible label, read from the Sanity `development` dataset —
see [`support/fixtures.ts`](support/fixtures.ts). Never use a `[Test] …` entry or
a `test-` slug as a fixture, and never assert exact menu counts.

## Path catalogue

Three forms are the destinations: **A** product request (`/request/products`,
via PDP → Add to request → `/request` → Start), **B** express (`/request/general`),
**C** services (`/request/services`).

| ID | Path | Spec |
|---|---|---|
| A1 | nav Products → line → Explore styles → style → PDP | ✅ `rfq/a1-nav-line-style-pdp.spec.ts` |
| A2 | nav Products → See all → `/products` search → PDP | (covered inside A10 step 3) |
| A3 | home hero finder → match → PDP | — |
| A4 | home Products row → line → style → PDP | — |
| A5 | nav Solutions → solution → hero tile → preview → PDP | (covered inside A10 step 2) |
| A6 | home Industries row → solution → PDP | — |
| A7 | nav Customization → category → detail → Works with → line → PDP | — |
| A8 | line landing → inspiration → PDP | — |
| A9 | PDP deep link → add → request | — |
| A10 | three entrances pooled into one request | ✅ `rfq/a10-multi-product.spec.ts` |
| A11 | PDP + customization + reference image | — |
| B1 | nav Get a Quote (from home and a deep page) | ✅ `rfq/b1-nav-get-a-quote.spec.ts` |
| B2 | home hero Get a Quote / Request a quote | — |
| B3 | line hero Get a quote | — |
| B4 | express + products in one session | — |
| C1 | `/request/services` (no in-app link found) | — |
| C2 | services upsell toggle inside the product form | — |

Variants still to add across paths: signed-in buyer (email locked to account),
post-submit `/account/requests/[id]`, and the request appearing in admin.

## Quirks the helpers handle

- **Mega-menu** opens on pointer *move* and only after hydration; clicking the
  trigger is a no-op. `openMegaMenu()` re-hovers until the sheet shows.
- **PDP has no `<main>` landmark**; the request rail is scoped by `article`.
- **Contact fields** (First/Last name, Email) have labels not tied to their
  inputs, so they have no accessible name; selected as `label + input`.
- **Ship-to and company address** share field names; always scope to
  `#section-requirements` / `#section-information`.
- Address line 1 is a Places autocomplete over free text — typed, not picked.
- **Review paper** is asserted by text inside `#section-review` (contact, brief,
  ship-to, one row per product with its contents), not by exact table cells —
  its columns changed on 2026-10-06.
