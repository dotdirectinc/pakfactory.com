# Newsletter — data journey & Zoho Campaigns wiring

How an email travels from the "Get the latest packaging digest" form into Zoho
Campaigns, and the terms that govern that journey (consent, opt-in, retention).

Owner: Engineering · Status: route hardened in-app; n8n + Zoho steps to wire.

---

## The journey

```
[Form]  cta-newsletter / widget-newsletter  (apps/blog)
   │  disclaimer + Privacy Policy link under the field (implied consent)
   │  POST { email, company(honeypot) }
   ▼
[Next route]  /api/newsletter                (apps/blog)
   │  validate · honeypot · rate-limit · stamp consent record
   │  POST (x-webhook-secret) { email, source, consent, consentText,
   │        consentVersion, subscribedAt, ip, userAgent }
   ▼
[n8n]  webhook workflow                       (orchestrator — ADR-007)
   │  verify secret · dedupe · map fields
   ▼
[Zoho Campaigns]  listsubscribe → mailing list (DOUBLE OPT-IN)
   │  Zoho sends confirmation email
   ▼
Subscriber clicks confirm → status = "subscribed"
```

The Next app never talks to Zoho directly — API credentials stay in n8n, the
integration boundary (per ADR-007). Zoho Campaigns has its **own mailing lists**;
Zoho CRM is **not** required for the newsletter.

## What the in-app route already does (`apps/blog/src/app/api/newsletter/route.ts`)

- **Validates** the email (regex) and lowercases it.
- **Honeypot** (`company` field): if filled, returns a fake success and drops it.
- **Best-effort rate-limit** (per warm instance; see "To productionize").
- **Implied consent** — a disclaimer + Privacy Policy link sits under the form;
  submitting is the agreement (no checkbox), confirmed by double opt-in.
- **Stamps a consent record**: `consentType: "implied"`, `consentText`,
  `consentVersion` (`2026-07-v1`), `subscribedAt`, `ip`, `userAgent`.
- **Forwards** the enriched payload to `NEWSLETTER_WEBHOOK_URL` with an optional
  `x-webhook-secret` header.
- Returns a **double-opt-in** success message ("check your inbox to confirm").

## Env vars

| Var | Where | Purpose |
|---|---|---|
| `NEWSLETTER_WEBHOOK_URL` | apps/blog (server) | The n8n webhook URL. Absent → route returns 503 "not configured". |
| `NEWSLETTER_WEBHOOK_SECRET` | apps/blog + n8n | Shared secret; n8n verifies the `x-webhook-secret` header. |

## n8n workflow (built)

**Workflow:** "Newsletter → Zoho Campaigns" · id `NsitN9JW9ReJx5IJ` · Pakfactory
project · https://pakfactory.app.n8n.cloud/workflow/NsitN9JW9ReJx5IJ

Flow: **Webhook** (POST `/webhook/newsletter-subscribe`) → **Verify Secret** (IF
on the `x-webhook-secret` header) → **Zoho Campaigns Subscribe** (HTTP
`POST https://campaigns.zoho.com/api/v1.1/json/listsubscribe`, Zoho OAuth2 cred,
`listkey` + `contactinfo={"Contact Email": <email>}`) → **Respond Success** 200;
the false branch → **Respond Unauthorized** 401 (Zoho never called).

Structurally tested (nodes pinned) — happy path routes to 200, wrong secret
routes to 401 without calling Zoho. The real Zoho call is untested until the
credential + list key are set.

**Go-live checklist (ops — not code):**
1. Attach the **Zoho OAuth2 credential** to the HTTP node; confirm its scope
   includes **Zoho Campaigns** (`ZohoCampaigns.contact.CREATE`).
2. Replace `REPLACE_WITH_ZOHO_LISTKEY` with the real mailing-list key.
3. Replace `REPLACE_WITH_SHARED_SECRET` in Verify Secret; set the same value as
   `NEWSLETTER_WEBHOOK_SECRET` in the blog app env.
4. Confirm the Zoho **region** domain (`.com` vs `.eu`/`.in`/`.ca`/`.com.au`).
5. Enable **double opt-in** on the list in Zoho Campaigns.
6. **Activate** the workflow; set its production webhook URL as
   `NEWSLETTER_WEBHOOK_URL` in the blog app env.
7. (Optional, later) parallel branch: upsert a Zoho CRM contact tagged
   `source: newsletter` if sales needs visibility.

## Terms of the data journey

- **Lawful basis: consent (implied + confirmed).** A disclaimer with a Privacy
  Policy link sits under the form; submitting is the agreement, and double
  opt-in provides the affirmative confirmation. No checkbox.
- **Double opt-in.** No address is a "subscriber" until it confirms via Zoho's
  email. This is the deliverability + compliance stance.
- **Consent record.** `consentText` + `consentVersion` + timestamp + IP travel
  with every subscribe and are stored in Zoho for proof. Bump `CONSENT_VERSION`
  when wording or the policy changes.
- **Right to withdraw.** Every Campaigns email includes an unsubscribe link
  (Zoho-managed); unsubscribes are honored by Zoho, no app change needed.
- **Data minimization.** Only email + consent metadata are collected. No name or
  marketing profile at signup.
- **Retention.** Confirmed subscribers persist in the Campaigns list until they
  unsubscribe. Unconfirmed (pending) contacts age out per Zoho's settings.

## Future direction

**n8n is the interim orchestrator.** It's the fastest path today (handles the
Zoho OAuth token refresh, retries, logging) and matches ADR-007. Longer term,
this subscribe flow is a candidate to move onto **Richard's DataEngine** — once
it's the unified ingestion/sync layer, the newsletter capture (and its consent
record) would flow through DataEngine instead of a bespoke n8n workflow.

Because the app only POSTs to `NEWSLETTER_WEBHOOK_URL`, that migration is a
config change (repoint the webhook) — no app redeploy. Revisit when DataEngine
is ready.

## To productionize

- Back the rate-limit with a **shared store** (e.g. Upstash Redis) — the in-memory
  limiter only slows abuse on a single warm serverless instance.
- Set `NEWSLETTER_WEBHOOK_URL` + `NEWSLETTER_WEBHOOK_SECRET` in the blog app env.
- Build + enable the n8n workflow; confirm the Zoho list key + double opt-in.
- Ensure `/privacy-policy` exists on the served site (the form links to it).
