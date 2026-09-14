# apps/admin — PakFactory back office

Operational surface for www request data and internal staff login. Part of epic [PROD-2405](https://dotdirect.atlassian.net/browse/PROD-2405).

## What this app owns

- Internal staff sign-in — **Google**, gated on an enabled `internal_user` row, with no email-domain restriction (PROD-2512 / ADR-0016; staff use `dotdirect.ca` and `pakfactory.com`). Email + password renders only behind `ADMIN_LOGIN=true`; see [Sign-in](#sign-in).
- Read-only views of buyer requests scoped to the signed-in sales member (PROD-2417+). `staff` accounts (no Zoho id) see no requests.
- Operational data backed by the `pakfactory-web` Supabase project

## What this app does not own

- **Content editing** — Sanity Studio (`apps/studio`)
- **Buyer-facing marketing** — `apps/www`
- **Out-of-scope epic items** — e.g. PROD-2357 Customers, commissions, Zoho Books (see PROD-2405 epic description)

## Stack

Next.js 16, React 19, Tailwind 4, port **4000**. PR base: `www-new-release`.

## Packages

| Package | Role |
|---|---|
| `@pakfactory/domain` | Request types, internal account model, read adapters |
| `@pakfactory/supabase` | SSR Supabase client + session helpers |
| `@pakfactory/auth-ui` | Shared login UI (props-only) |
| `@pakfactory/ui` | Design tokens and primitives |
| `@pakfactory/sanity` | Content search GROQ / Algolia record contracts (ADR-018) |

Does **not** depend on `@pakfactory/components`.

## Mock-first data layer (wire-up later)

Until PROD-2414/PROD-2415 land, admin uses **real Supabase auth** with **mock** internal-account and request reads.

| `ADMIN_DATA_SOURCE` | Internal account | Requests |
|---|---|---|
| `mock` (default) | `ADMIN_INTERNAL_ACCOUNT_ALLOWLIST` env | Fixtures in `@pakfactory/domain` |
| `supabase` | `lib/adapters/supabase-internal-account.ts` (PROD-2415) | `lib/adapters/supabase-requests.ts` (PROD-2414/2415) |

**Wire-up contract:**

- **PROD-2415** — implement `createSupabaseInternalAccountAdapter()` (role + `zohoUserId` from Supabase; never `user_metadata`).
- **PROD-2414** — implement `createSupabaseRequestReadAdapter()` against the `requests` table + RLS.
- Flip `ADMIN_DATA_SOURCE=supabase` when both adapters are ready.

Factory: [`src/lib/adapters.ts`](src/lib/adapters.ts).

## Local dev

1. Root [`.env.local`](../../.env.local) must include `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same `pakfactory-web` project as www) when testing real login.
2. Copy [`apps/admin/.env.example`](.env.example) to `apps/admin/.env.local` (or set vars in root `.env.local`).
3. Run `pnpm dev:admin` from the repo root → http://localhost:4000.

### Dev auth bypass (local UI only)

Set in `apps/admin/.env.local` — **never in production**:

```env
ADMIN_DEV_BYPASS=true
ADMIN_DEV_BYPASS_ZOHO_USER_ID=zoho-user-sales-1
```

Active only when `NODE_ENV=development`, `ADMIN_DEV_BYPASS=true`, and not `VERCEL_ENV=production`. Opens http://localhost:4000/requests without login; `/login` redirects home. Header shows **Dev Mode**. Logic: [`src/lib/auth/dev-bypass.ts`](src/lib/auth/dev-bypass.ts). Backend restores full auth on [PROD-2415](https://dotdirect.atlassian.net/browse/PROD-2415) in [`src/lib/auth/require-internal-user.ts`](src/lib/auth/require-internal-user.ts).

Without `ADMIN_DEV_BYPASS=true`, use real Supabase login: set `ADMIN_INTERNAL_ACCOUNT_ALLOWLIST` to `your-email@example.com:zoho-user-sales-1` and sign in on `/login`. Active `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in the repo root `.env.local` — run `pnpm env:staging` (or `pnpm env:prod`) if you only have `_STAGING` / `_PROD` suffixed keys.

`/login` offers **Google only** unless you also set `ADMIN_LOGIN=true` — a local machine with no staff Google session needs that flag to get an email + password form at all.

## Sign-in

Google is the sign-in path. **One thing is checked: an enabled `internal_user` row** (PROD-2512 / ADR-0016 D3). The row is what a person provisions, and it is the only thing that makes someone staff.

- **No email-domain check.** Staff hold addresses on `dotdirect.ca` and `pakfactory.com`; a domain test refused real colleagues or had to grow a list that drifts from the rows that grant access. The old `internal-domain.ts` constant is gone.
- **No `hd` hint.** Google's hosted-domain hint takes one domain, so either value would hide the other domain's accounts. The authorize request sends `prompt=select_account` instead, so a personal Google session gets the account chooser rather than a silent sign-in.
- **Roles** (`packages/domain` `InternalRole`): `sales` (scoped to a Zoho id; sees assigned requests) and `staff` (no RFQ scope; request views are empty). Spec-registry permissions are registry grants, not this role (ADR-0016 D4).
- **Sessions:** admin and the customer site share one Supabase project but keep **host-only** cookies (`packages/supabase/src/server.ts` sets no cookie `domain`), so the two sign-ins stay separate per host. Separation is not authorization: every staff decision checks the row server-side.

The check lives in [`src/app/auth/callback/route.ts`](src/app/auth/callback/route.ts), the one place a session is established, and sign-out happens **before** the redirect so no admin cookie survives a refusal. Every refusal returns the same message on purpose — "no account for this address" would confirm which addresses are staff.

### `ADMIN_LOGIN` — the email + password fallback

Unset, or anything but exactly `true`, and `/login` is Google-only. Set `true` to render the shared `LoginForm` alongside the Google button — for a machine that cannot complete a Google round trip, or to get in while OAuth is broken.

- **Server-side, not `NEXT_PUBLIC_`.** The page reads it and passes a boolean down; flipping it needs a redeploy, not a rebuild. Logic: [`src/lib/auth/password-login.ts`](src/lib/auth/password-login.ts).
- **The flag closes the server action, not just the form.** `signInInternal` re-checks it before touching Supabase — a server action is a POST endpoint whether or not a form renders.
- **The password path still requires an `internal_user` row.** www customers live in the *same* Supabase auth project, so without that check any buyer's password would open admin. Like the callback, it does not check the email domain; the row is the gate.
- There is deliberately **no forgot-password or sign-up link** in either mode. Those pointed into the customer app (`lib/www-links.ts`, deleted) and are how staff ended up in the buyer flows. `NEXT_PUBLIC_WWW_URL` is not read by admin.

## Shell chrome

Authenticated chrome is [`AdminShell`](src/components/layout/admin-shell.tsx): dark top bar + left sidebar + `rounded-t-xl` muted body (scroll in `<main>`).

| Piece | File | Notes |
| --- | --- | --- |
| Top bar | [`admin-top-bar.tsx`](src/components/layout/admin-top-bar.tsx) | ~60px tall; logo + Dev Mode badge; search absolutely centered (`max-w-2xl`); account menu on the right |
| Sidebar | [`admin-sidebar.tsx`](src/components/layout/admin-sidebar.tsx) | Primary nav (Requests today; Settings stub) |
| Account menu | [`admin-account-menu.tsx`](src/components/account/admin-account-menu.tsx) | **Identity + Sign out only** — do not duplicate sidebar destinations |

Global search open / dialog behavior stays under ADR-018 (below). Do not bake pixel heights or max-widths into ADRs; change chrome in these files.

## Requests index

`/requests` follows a Shopify Orders–style index: page title + All / local search strip + dense table in a white card ([`request-list.tsx`](src/components/requests/request-list.tsx)).

List rows use **`RequestSummary`** from [`@pakfactory/domain/request`](../../packages/domain/src/request.ts) (`contactName`, `timeline`, `lineCount`, `contactIndustry`, plus ref / company / email / entryKind / submittedAt). When extending the summary, keep mock [`toSummary`](../../packages/domain/src/adapters/mock-requests.ts) and Supabase [`toRequestSummary`](src/lib/adapters/rfq-to-domain.ts) in sync.

Do **not** invent RFQ workflow statuses, metrics sparklines, Export/Create, or bulk checkboxes until product asks.

## Global search (ADR-018)

Shell search (`⌘K` / top-bar) is governed by [`docs/adr/0018-admin-search-foundation.md`](../../docs/adr/0018-admin-search-foundation.md): dual corpus (ops Supabase vs content Sanity), BFF `POST /api/search`, owner-scoped requests.

| Corpus | Indexes | Sync | Query |
| --- | --- | --- | --- |
| Ops | `admin_requests` | Human backfill `pnpm exec tsx scripts/algolia-backfill-requests.ts`; webhook TBD | Algolia + `assignedOwnerCrmId` filter, else adapter list filter |
| Content | `posts` (reuse), `content_products`, `content_customizations`, `content_case_studies` | Sanity Functions `algolia-document-sync` + `algolia-content-sync`; studio configure/backfill scripts | Algolia first, GROQ fallback |

Env: `ALGOLIA_APP_ID`, search via `ALGOLIA_SEARCH_KEY` or `NEXT_PUBLIC_ALGOLIA_API_KEY` (server-only in BFF), write `ALGOLIA_WRITE_KEY` for scripts/Functions. Optional `ADMIN_WWW_ORIGIN` / `ADMIN_BLOG_ORIGIN` for outbound content links. Customers / Specs remain stubs — see `lib/search/shelf.ts`.

## Customer attachments

Files a buyer uploaded, on the request detail page. Everything uploadable is
browser-viewable — png, jpeg, webp, gif, pdf — so images render as thumbnails
with a lightbox, and a pdf gets a button rather than an embedded viewer.

Two mechanisms, deliberately different:

| | path | disposition |
|---|---|---|
| **View** | `GET /api/attachments/<rfqId>/<attachmentId>` (route handler) | `inline` |
| **Download** | `resolveAttachmentUrl` (server action, minted on click) | `attachment` |

### Why viewing needs a route handler

ADR-0013 D3 keeps presigned permits **out of the DOM**: one rendered into the
page is copyable, valid for anyone holding it, and expires after 300s while the
rep is still reading. An `<img src>` needs a url, so the naive way to add
previews is to mint a permit per file on load — which is exactly what D3 rules
out.

The route handler preserves it. What lands in the DOM is a **same-origin path**,
worthless without the admin session cookie. It authorises on every hit, mints a
fresh permit and 302s to it, so nothing is copyable and nothing goes stale while
the page sits open.

It answers **404** — never a redirect to `/login` — because the browser would
follow a redirect and render login HTML inside an `<img>`. A signed-out request,
a stranger's `rfqId` and a mismatched pair are all one answer.

### The gate

`authorizeAttachment` ([`src/lib/attachments/authorize.ts`](src/lib/attachments/authorize.ts))
is the single implementation, shared by both callers. The backend's
`/api/request/attachments/resolve` authorises the **service** (HMAC), not the
person — it trusts this BFF to have checked already, so a leaked
`SERVICE_SHARED_SECRET` would otherwise read every customer's artwork.

1. `requireInternalUser` — session + enabled internal account.
2. `getById(rfqId, zohoUserId)` — the same RLS path the page uses; null refuses.
3. The attachment must belong to that request.

`resolveFromBackend` ([`src/lib/attachments/backend-resolve.ts`](src/lib/attachments/backend-resolve.ts))
does the signing and authorises nobody. It is shared so the two paths cannot
drift on the signature — a signature subtly different in one of two places fails
as a 401 nobody can read.

### When downloads or previews fail

Both need `BACKEND_API_BASE_URL` and `SERVICE_SHARED_SECRET`. Without them the
file list still renders and only view/download fail; the log now names **which**
variable is missing.

The failure `reason` is coarse on purpose (`not_configured`, `unreachable`,
`unauthorized`, `not_found`, `backend_error`) — it is for our logs and for
choosing a status code, never for a message shown to a rep, since "not found"
would confirm which of the two ids was wrong.

⚠️ A **503 from the backend** is not an admin problem: it means the signature was
accepted and the API box itself failed to reach S3 or the database. On 2026-09-08
that was the box having no AWS credentials at all (no IAM instance profile), and
the reason was only visible in the box's own journal:

```
sudo journalctl -u pakfactory-api -n 200 | grep -A5 "failed to resolve an attachment url"
```

## Troubleshooting

### Login page error: Supabase URL and Key required

Root `.env.local` may list `NEXT_PUBLIC_SUPABASE_URL_STAGING` without the active `NEXT_PUBLIC_SUPABASE_URL`. Apps read the unsuffixed keys only. Fix: `pnpm env:staging` from the repo root, then restart `pnpm dev:admin`. Or skip login for UI work with `ADMIN_DEV_BYPASS=true` in `apps/admin/.env.local`.

### HTTP 431 or redirect weirdness

**HTTP 431 (Request Header Fields Too Large)** usually means the browser is sending oversized `Cookie` headers. Admin and www share the same `localhost` Supabase cookies (port does not isolate cookies on localhost), so a prior redirect loop or a www buyer session can leave bloated `sb-*-auth-token*` chunks.

**Recovery (one-time):**

1. Chrome → DevTools → Application → Cookies → `http://localhost` → delete all entries (especially `sb-*-auth-token*`).
2. Or use an incognito window.
3. Restart `pnpm dev:admin` and open `http://localhost:4000/login` first.

Non-internal sessions are cleared via [`src/app/auth/sign-out/route.ts`](src/app/auth/sign-out/route.ts) (Route Handler), not in Server Components — `signOut()` during RSC render cannot write cookies.
